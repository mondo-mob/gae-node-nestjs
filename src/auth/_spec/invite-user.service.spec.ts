import { anything, capture, instance, mock, reset, verify, when } from 'ts-mockito';
import { IUser } from '../..';
import { Configuration } from '../../configuration';
import { GmailSender } from '../../gmail/gmail.sender';
import { CredentialRepository, LoginCredentials, UserInviteRepository } from '../auth.repository';
import { INVITE_CODE_EXPIRY, InviteUserService } from '../invite-user.service';
import { AbstractUserService } from '../user.service';
import { mockContext } from './auth.service.spec';

describe('InviteUserService', () => {
  const credentialRepository = mock(CredentialRepository);
  const gmailSender = mock(GmailSender);
  const userInviteRepository = mock(UserInviteRepository);
  const userService = mock(AbstractUserService);

  const context = mockContext();

  beforeEach(() => {
    reset(credentialRepository);
    reset(gmailSender);
    reset(userInviteRepository);
    reset(userService);
  });

  describe('inviteUser', () => {
    it('should throw an error if the email address already exists', async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        instance(userService),
        instance(userInviteRepository),
      );

      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        id: '123',
      } as LoginCredentials);

      await expect(
        authService.inviteUser(context, 'test@example.com', []),
      ).rejects.toHaveProperty('message', 'Email already exists');
    });

    it('should throw an error if roles contains \'super\'', async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        instance(userService),
        instance(userInviteRepository),
      );

      when(credentialRepository.get(context, 'test@example.com')).thenResolve(
        undefined,
      );

      await expect(
        authService.inviteUser(context, 'test@example.com', ['admin', 'super']),
      ).rejects.toHaveProperty('message', 'Cannot assign super role to users');
    });

    it('should generate an invite for existing user and send email', async () => {
      const authService = new InviteUserService(
          instance(credentialRepository),
          instance(gmailSender),
          {} as Configuration,
          instance(userService),
          instance(userInviteRepository),
      );
      when(userService.getByEmail(context, 'test@example.com')).thenResolve({
        id: 'user-123',
      } as IUser);

      await authService.inviteUser(context, 'test@example.com', ['admin']);

      verify(userService.create(anything(), anything())).never();
      const [, invite] = capture(userInviteRepository.save).last();
      const [, mail] = capture(gmailSender.send).last();

      expect((invite as any).userId).toBe('user-123');
      expect(mail.html).toMatch((invite as any).id);
    });

    it('should generate an invite for new user and send email', async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        instance(userService),
        instance(userInviteRepository),
      );
      when(userService.create(context, anything())).thenResolve({
        id: 'user-123',
      } as IUser);

      await authService.inviteUser(context, 'test@example.com', ['admin']);

      const [, createRequest] = capture(userService.create).last();
      const [, invite] = capture(userInviteRepository.save).last();
      const [, mail] = capture(gmailSender.send).last();

      expect(createRequest).toMatchObject({
        email: 'test@example.com',
        enabled: false,
      });
      expect((invite as any).userId).toBe('user-123');
      expect(mail.html).toMatch((invite as any).id);
    });
  });

  describe('activateAccount', () => {
    it('should error if invite code does not exist', async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        instance(userService),
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
        instance(userService),
        instance(userInviteRepository),
      );

      when(userInviteRepository.get(context, '12345')).thenResolve({
        id: '12345',
        email: 'test@example.com',
        createdAt: new Date(Date.now() - INVITE_CODE_EXPIRY * 2),
        roles: ['admin'],
        userId: 'user-123',
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
        instance(userService),
        instance(userInviteRepository),
      );

      when(userInviteRepository.get(context, '12345')).thenResolve({
        id: '12345',
        email: 'test@example.com',
        createdAt: new Date(),
        roles: ['admin'],
        userId: 'user-123',
      });

      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        id: 'test@example.com',
      } as LoginCredentials);

      await expect(
        authService.activateAccount(context, '12345', 'Test User', 'password'),
      ).rejects.toHaveProperty('message', 'Account already registered');
    });

    it('should activate the user account', async () => {
      const authService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        {} as Configuration,
        instance(userService),
        instance(userInviteRepository),
      );

      when(userInviteRepository.get(context, '12345')).thenResolve({
        id: '12345',
        email: 'test@example.com',
        createdAt: new Date(),
        roles: ['admin'],
        userId: 'user-123',
      });
      const expectedUpdates = {
        name: 'Test User',
        roles: ['admin'],
        enabled: true,
      };
      when(userService.update(context, 'user-123', anything())).thenResolve({
        id: 'user-123',
        email: 'test@example.com',
        ...expectedUpdates,
      });

      const user = await authService.activateAccount(
        context,
        '12345',
        'Test User',
        'password',
      );

      verify(userInviteRepository.delete(context, '12345')).once();

      const [, createdCredentials] = capture(credentialRepository.save).last();
      const [, , updateRequest] = capture(userService.update).last();

      expect(createdCredentials).toMatchObject({
        id: 'test@example.com',
        type: 'password',
        userId: user.id,
      });
      expect(updateRequest).toMatchObject(expectedUpdates);
    });
  });
});
