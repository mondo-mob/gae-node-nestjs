import {
  CredentialRepository,
  LoginCredentials,
  UserInviteRepository,
} from '../auth.repository';
import { INVITE_CODE_EXPIRY, InviteUserService } from '../invite-user.service';
import { mockContext } from './auth.service.spec';
import {
  mock,
  instance,
  reset,
  when,
  verify,
  capture,
} from 'ts-mockito';
import { GmailSender } from '../../gmail/gmail.sender';
import { Configuration } from '../../configuration';

describe('InviteUserService', () => {
  const credentialRepository = mock(CredentialRepository);
  const gmailSender = mock(GmailSender);
  const userInviteRepository = mock(UserInviteRepository);

  const context = mockContext();

  beforeEach(() => {
    reset(credentialRepository);
    reset(gmailSender);
    reset(userInviteRepository);
  });

  describe('inviteUser', () => {
    it('should throw an error if the email address already exists', async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        {} as any,
        instance(userInviteRepository),
      );

      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        id: '123',
      } as LoginCredentials);

      await expect(
        authService.inviteUser(context, 'test@example.com', []),
      ).rejects.toHaveProperty('message', 'Email already exists');
    });

    it("should throw an error if roles contains 'super'", async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        {} as any,
        instance(userInviteRepository),
      );

      when(credentialRepository.get(context, 'test@example.com')).thenResolve(
        undefined,
      );

      await expect(
        authService.inviteUser(context, 'test@example.com', ['admin', 'super']),
      ).rejects.toHaveProperty('message', 'Cannot assign super role to users');
    });

    it('should generate an invite and send it to the user', async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        {} as any,
        instance(userInviteRepository),
      );

      await authService.inviteUser(context, 'test@example.com', ['admin']);

      const [, value] = capture(userInviteRepository.save).last();
      const [, mail] = capture(gmailSender.send).last();

      expect(mail.html).toMatch((value as any).id);
    });
  });

  describe('activateAccount', () => {
    it('should error if invite code does not exist', async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        {} as any,
        instance(userInviteRepository),
      );

      await expect(
        authService.activateAccount(context, '12345', 'Test User', 'password'),
      ).rejects.toHaveProperty('message', 'Invalid invite code');
    });

    it('should error if invite code has expired', async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        {} as any,
        instance(userInviteRepository),
      );

      when(userInviteRepository.get(context, '12345')).thenResolve({
        id: '12345',
        email: 'test@example.com',
        createdAt: new Date(Date.now() - INVITE_CODE_EXPIRY * 2),
        roles: ['admin'],
      });

      await expect(
        authService.activateAccount(context, '12345', 'Test User', 'password'),
      ).rejects.toHaveProperty('message', 'Invite code has expired');
    });

    it('should error if the account has been created', async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        {} as any,
        instance(userInviteRepository),
      );

      when(userInviteRepository.get(context, '12345')).thenResolve({
        id: '12345',
        email: 'test@example.com',
        createdAt: new Date(),
        roles: ['admin'],
      });

      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        id: 'test@example.com',
      } as LoginCredentials);

      await expect(
        authService.activateAccount(context, '12345', 'Test User', 'password'),
      ).rejects.toHaveProperty('message', 'Account already registered');
    });

    it('should create the user account', async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        {
          create: (_: any, user: any) => user,
        } as any,
        instance(userInviteRepository),
      );

      when(userInviteRepository.get(context, '12345')).thenResolve({
        id: '12345',
        email: 'test@example.com',
        createdAt: new Date(),
        roles: ['admin'],
      });

      const user = await authService.activateAccount(
        context,
        '12345',
        'Test User',
        'password',
      );

      verify(userInviteRepository.delete(context, '12345')).once();

      const [, createdCredentials] = capture(credentialRepository.save).last();

      expect(createdCredentials).toMatchObject({
        id: 'test@example.com',
        type: 'password',
        userId: user.id,
      });
    });
  });
});
