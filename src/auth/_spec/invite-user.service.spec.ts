import {
  CredentialRepository,
  LoginCredentials,
  UserInviteRepository,
} from '../auth.repository';
import { UserRepository } from '../../users/users.repository';
import { ConfigurationProvider } from '../../config/config.provider';
import { INVITE_CODE_EXPIRY, InviteUserService } from '../invite-user.service';
import { mockContext } from './auth.service.spec';
import {
  mock,
  instance,
  reset,
  when,
  verify,
  capture,
  anything,
} from 'ts-mockito';
import { GmailSender } from '../../gmail/gmail.sender';

describe('InviteUserService', () => {
  const credentialRepository = mock(CredentialRepository);
  const userRepository = mock(UserRepository);
  const configurationProvider = mock(ConfigurationProvider);
  const gmailSender = mock(GmailSender);
  const userInviteRepository = mock(UserInviteRepository);

  const authService = new InviteUserService(
    instance(credentialRepository),
    instance(userRepository),
    instance(gmailSender),
    instance(configurationProvider),
    instance(userInviteRepository),
  );
  const context = mockContext();

  beforeEach(() => {
    reset(credentialRepository);
    reset(userRepository);
    reset(configurationProvider);
    reset(gmailSender);
    reset(userInviteRepository);
  });

  describe('inviteUser', () => {
    it('should throw an error if the email address already exists', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        id: '123',
      } as LoginCredentials);

      await expect(
        authService.inviteUser(context, 'test@example.com', []),
      ).rejects.toHaveProperty('message', 'Email already exists');
    });

    it("should throw an error if roles contains 'super'", async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve(
        undefined,
      );

      await expect(
        authService.inviteUser(context, 'test@example.com', ['admin', 'super']),
      ).rejects.toHaveProperty('message', 'Cannot assign super role to users');
    });

    it('should generate an invite and send it to the user', async () => {
      await authService.inviteUser(context, 'test@example.com', ['admin']);

      const [, value] = capture(userInviteRepository.save).last();
      const [, mail] = capture(gmailSender.send).last();

      expect(mail.html).toMatch((value as any).id);
    });
  });

  describe('activateAccount', () => {
    it('should error if invite code does not exist', async () => {
      await expect(
        authService.activateAccount(context, '12345', 'Test User', 'password'),
      ).rejects.toHaveProperty('message', 'Invalid invite code');
    });

    it('should error if invite code has expired', async () => {
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
      when(userInviteRepository.get(context, '12345')).thenResolve({
        id: '12345',
        email: 'test@example.com',
        createdAt: new Date(),
        roles: ['admin'],
      });

      when(userRepository.save(context, anything())).thenCall((_c, u) => u);

      const user = await authService.activateAccount(
        context,
        '12345',
        'Test User',
        'password',
      );

      verify(userInviteRepository.delete(context, '12345')).once();
      verify(userRepository.save(context, user)).once();

      const [, createdCredentials] = capture(credentialRepository.save).last();

      expect(createdCredentials).toMatchObject({
        id: 'test@example.com',
        type: 'password',
        userId: user.id,
      });
    });
  });
});
