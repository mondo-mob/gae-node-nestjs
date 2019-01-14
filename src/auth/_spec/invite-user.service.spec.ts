import { anything, capture, instance, mock, reset, verify, when } from 'ts-mockito';
import { IUser } from '../..';
import { Configuration } from '../../configuration';
import { GmailSender } from '../../mail/gmail/gmail.sender';
import { CredentialRepository, LoginCredentials, UserInvite, UserInviteRepository } from '../auth.repository';
import { IInviteUserRequest, INVITE_CODE_EXPIRY, InviteUserService } from '../invite-user.service';
import { AbstractUserService } from '../user.service';
import { mockContext } from './auth.service.spec';

describe('InviteUserService', () => {
  const credentialRepository = mock(CredentialRepository);
  const gmailSender = mock(GmailSender);
  const userInviteRepository = mock(UserInviteRepository);
  const userService = mock(AbstractUserService);
  const configuration = {
    host: 'http://localhost:3000',
  } as Configuration;

  const context = mockContext();
  let inviteUserService: InviteUserService;

  beforeEach(() => {
    reset(credentialRepository);
    reset(gmailSender);
    reset(userInviteRepository);
    reset(userService);

    inviteUserService = new InviteUserService(
        instance(credentialRepository),
        instance(gmailSender),
        configuration,
        instance(userService),
        instance(userInviteRepository),
    );
  });

  describe('inviteUser', () => {
    let inviteRequest: IInviteUserRequest;

    beforeEach(() => {
      inviteRequest = {
        email: 'test@example.com',
        roles: [],
      }
    });

    it('should throw an error if the email address already exists', async () => {
      when(credentialRepository.get(context, inviteRequest.email)).thenResolve({
        id: '123',
      } as LoginCredentials);

      await expect(
        inviteUserService.inviteUser(context, inviteRequest),
      ).rejects.toHaveProperty('message', 'Email already exists');
    });

    it('should throw an error if roles contains \'super\'', async () => {
      inviteRequest.roles = ['admin', 'super'];

      when(credentialRepository.get(context, inviteRequest.email)).thenResolve(
        undefined,
      );

      await expect(
        inviteUserService.inviteUser(context, inviteRequest),
      ).rejects.toHaveProperty('message', 'Cannot assign super role to users');
    });

    it('should generate an invite for existing user and send email', async () => {
      inviteRequest.roles = ['admin'];
      const existingUser = {
        id: 'user-123',
        email: inviteRequest.email,
        roles: [],
        enabled: false,
      } as IUser;

      when(userService.getByEmail(context, inviteRequest.email)).thenResolve(existingUser);

      const result = await inviteUserService.inviteUser(context, inviteRequest);

      verify(userService.create(anything(), anything())).never();
      const [, invite] = capture(userInviteRepository.save).last();
      const [, mail] = capture(gmailSender.send).last();

      expect(result).toEqual({
        user: existingUser,
        inviteId: (invite as any).id,
        activateLink: `http://localhost:3000/activate/${(invite as any).id}`,
      });
      expect((invite as any).userId).toBe(existingUser.id);
      expect(mail.html).toMatch((invite as any).id);
    });

    it('should generate an invite for new user and send email', async () => {
      inviteRequest.roles = ['admin'];
      const createdUser = {
        id: 'user-123',
        email: inviteRequest.email,
        roles: [],
        enabled: false,
      } as IUser;

      when(userService.create(context, anything())).thenResolve(createdUser);

      const result = await inviteUserService.inviteUser(context, inviteRequest);

      const [, createRequest] = capture(userService.create).last();
      const [, invite] = capture(userInviteRepository.save).last();
      const [, mail] = capture(gmailSender.send).last();

      expect(result).toEqual({
        user: createdUser,
        inviteId: (invite as any).id,
        activateLink: `http://localhost:3000/activate/${(invite as any).id}`,
      });
      expect(createRequest).toEqual({
        email: inviteRequest.email,
        enabled: false,
      });
      expect((invite as any).userId).toBe(createdUser.id);
      expect(mail.html).toMatch((invite as any).id);
    });

    it('should generate an invite for new user and skip sending email', async () => {
      inviteRequest.roles = ['admin'];
      inviteRequest.skipEmail = true;
      const createdUser = {
        id: 'user-123',
        email: inviteRequest.email,
        roles: [],
        enabled: false,
      } as IUser;

      when(userService.create(context, anything())).thenResolve(createdUser);

      const result = await inviteUserService.inviteUser(context, inviteRequest);

      const [, createRequest] = capture(userService.create).last();
      const [, invite] = capture(userInviteRepository.save).last();
      verify(gmailSender.send(context, anything())).never();

      expect(result).toEqual({
        user: createdUser,
        inviteId: (invite as any).id,
        activateLink: `http://localhost:3000/activate/${(invite as any).id}`,
      });
      expect(createRequest).toEqual({
        email: inviteRequest.email,
        enabled: false,
      });
      expect((invite as any).userId).toBe(createdUser.id);
    });

  });

  describe('inviteUserIfRequired', () => {
    let inviteRequest: IInviteUserRequest;

    beforeEach(() => {
      inviteRequest = {
        email: 'test@example.com',
        roles: [],
      }
    });

    it('should update existing user and not generate invite when user has auth', async () => {
      inviteRequest.roles = ['user'];
      inviteRequest.skipEmail = true;
      const existingUser = {
        id: 'user-123',
        email: inviteRequest.email,
        roles: ['admin'],
        enabled: false,
      } as IUser;
      const expectedUpdates = {
        enabled: true,
        roles: ['admin', 'user'],
      };
      const updatedUser = {
        ...existingUser,
        ...expectedUpdates,
      };

      when(credentialRepository.get(context, inviteRequest.email)).thenResolve({
        id: '123',
      } as LoginCredentials);
      when(userService.getByEmail(context, inviteRequest.email)).thenResolve(existingUser);
      when(userService.update(context, existingUser.id, anything())).thenResolve(updatedUser);

      const result = await inviteUserService.inviteUserIfRequired(context, inviteRequest);

      verify(userService.create(anything(), anything())).never();
      verify(userInviteRepository.save(anything(), anything())).never();
      verify(gmailSender.send(context, anything())).never();
      const [, , updateRequest] = capture(userService.update).last();

      expect(result).toEqual({
        user: updatedUser,
      });
      expect(updateRequest).toEqual(expectedUpdates);
    });

    it('should generate an invite for new user and skip sending email', async () => {
      inviteRequest.roles = ['admin'];
      inviteRequest.skipEmail = true;
      const createdUser = {
        id: 'user-123',
        email: inviteRequest.email,
        roles: [],
        enabled: false,
      } as IUser;

      when(userService.create(context, anything())).thenResolve(createdUser);

      const result = await inviteUserService.inviteUserIfRequired(context, inviteRequest);

      const [, createRequest] = capture(userService.create).last();
      const [, invite] = capture(userInviteRepository.save).last();
      verify(gmailSender.send(context, anything())).never();

      expect(result).toEqual({
        user: createdUser,
        inviteId: (invite as any).id,
        activateLink: `http://localhost:3000/activate/${(invite as any).id}`,
      });
      expect(createRequest).toEqual({
        email: inviteRequest.email,
        enabled: false,
      });
      expect((invite as any).userId).toBe(createdUser.id);
    });
  });

  describe('activateAccount', () => {
    it('should error if invite code does not exist', async () => {

      await expect(
        inviteUserService.activateAccount(context, '12345', 'Test User', 'password'),
      ).rejects.toHaveProperty('message', 'Invalid invite code');

    });

    it('should error if invite code has expired', async () => {
      when(userInviteRepository.get(context, '12345')).thenResolve({
        id: '12345',
        email: 'test@example.com',
        createdAt: new Date(Date.now() - INVITE_CODE_EXPIRY * 2),
        roles: ['admin'],
        userId: 'user-123',
      });

      await expect(
        inviteUserService.activateAccount(context, '12345', 'Test User', 'password'),
      ).rejects.toHaveProperty('message', 'Invite code has expired');
    });

    it('should error if the account has been created', async () => {
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
        inviteUserService.activateAccount(context, '12345', 'Test User', 'password'),
      ).rejects.toHaveProperty('message', 'Account already registered');
    });

    it('should activate the user account', async () => {
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

      const user = await inviteUserService.activateAccount(
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
      expect(updateRequest).toEqual(expectedUpdates);
    });
  });

  describe('getInvitedUser', () => {
    let userInvite: UserInvite;
    let user: IUser;

    beforeEach(() => {
      userInvite = {
        id: '12345',
        email: 'test@example.com',
        createdAt: new Date(),
        roles: ['admin'],
        userId: 'user-123',
      };

      user = {
        id: '12345',
        email: 'test@example.com',
        enabled: false,
        roles: [],
      };
    });

    it('should get the invited user', async () => {
      when(userInviteRepository.get(context, '12345')).thenResolve(userInvite);
      when(userService.get(context, userInvite.userId)).thenResolve(user);

      const result = await inviteUserService.getInvitedUser(context, '12345');

      expect(result).toBe(user);
    });

    it('should not return anything when invite does not exist', async () => {
      when(userInviteRepository.get(context, '12345')).thenResolve(undefined);

      const result = await inviteUserService.getInvitedUser(context, '12345');

      expect(result).toBeUndefined();
    });

    it('should not return anything when invite hasExpired', async () => {
      userInvite.createdAt = new Date(Date.now() - INVITE_CODE_EXPIRY * 2);
      when(userInviteRepository.get(context, '12345')).thenResolve(userInvite);
      when(userService.get(context, userInvite.userId)).thenResolve(user);

      const result = await inviteUserService.getInvitedUser(context, '12345');

      expect(result).toBeUndefined();
    });

  });

});
