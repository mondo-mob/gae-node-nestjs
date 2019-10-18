import { omit } from 'lodash';
import { anyFunction, anything, instance, mock, objectContaining, reset, verify, when } from 'ts-mockito';
import { Configuration } from '../../configuration';
import { Context } from '../../datastore/context';
import { DatastoreLoader } from '../../datastore/loader';
import { CredentialRepository } from '../auth.repository';
import { AuthService, hashPassword } from '../auth.service';
import { AbstractUserService } from '../user.service';

export const mockContext = () => {
  const datastoreLoader = mock(DatastoreLoader);

  const context = {
    datastore: instance(datastoreLoader),
  } as Context;

  when(datastoreLoader.inTransaction(anyFunction())).thenCall((cb: any) => cb(context));

  return context;
};

describe('AuthService', () => {
  const credentialRepository = mock(CredentialRepository);
  const context = mockContext();
  const userService = mock(AbstractUserService);
  let configuration: Configuration;
  let authService: AuthService;

  beforeEach(() => {
    reset(credentialRepository);
    reset(userService);
    configuration = {} as Configuration;
    when(userService.create(anything(), anything())).thenCall(async (_: any, user: any) => user);
    when(userService.update(anything(), anything(), anything())).thenCall(async (_: any, _id: any, user: any) => user);
    authService = new AuthService(instance(credentialRepository), instance(userService), configuration);
  });

  describe('validateUser', () => {
    it('throws an error when account does not exist', async () => {
      await expect(authService.validateUser(context, 'username', 'password')).rejects.toHaveProperty(
        'message',
        'No credentials found for user',
      );
    });

    it('throws an error when the account is not associated with a password', async () => {
      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'google',
        userId: '12345',
        id: 'username',
      });

      await expect(authService.validateUser(context, 'username', 'password')).rejects.toHaveProperty(
        'message',
        'No credentials found for user',
      );
    });

    it('throws an error when the password does not match', async () => {
      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'password',
        userId: '12345',
        id: 'username',
        password: await hashPassword('abc123'),
      });

      await expect(authService.validateUser(context, 'username', 'password')).rejects.toHaveProperty(
        'message',
        'Invalid password for user',
      );
    });

    it('throws an error when the backing user does not exist', async () => {
      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'password',
        userId: '12345',
        id: 'username',
        password: await hashPassword('password'),
      });
      when(userService.get(context, anything())).thenResolve(null);

      await expect(authService.validateUser(context, 'username', 'password')).rejects.toHaveProperty(
        'message',
        'User not found',
      );
    });

    it('throws an error when the backing user is not enabled', async () => {
      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'password',
        userId: '12345',
        id: 'username',
        password: await hashPassword('password'),
      });
      when(userService.get(context, '12345')).thenResolve({ id: '12345', enabled: false });

      await expect(authService.validateUser(context, 'username', 'password')).rejects.toHaveProperty(
        'message',
        'User account is disabled',
      );
    });

    it('returns the user when validation succeeded', async () => {
      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'password',
        userId: '12345',
        id: 'username',
        password: await hashPassword('password'),
      });
      when(userService.get(context, '12345')).thenResolve({ id: '12345', enabled: true });

      await expect(authService.validateUser(context, 'username', 'password')).resolves.toEqual({
        id: '12345',
        enabled: true,
      });
    });
  });

  describe('validateUserGoogle', () => {
    const profile = {
      id: '12345',
      emails: [
        {
          verified: true,
          value: 'test@example.com',
        },
      ],
      displayName: 'test',
    };

    it('fails when the profile does not match the expected format', async () => {
      await expect(authService.validateUserGoogle(context, omit(profile, 'id'))).rejects.toHaveProperty(
        'message',
        'Expecting string at id but instead got: undefined.',
      );
    });

    it('fails when there are no matching email addresses', async () => {
      await expect(
        authService.validateUserGoogle(context, {
          ...profile,
          emails: [],
        }),
      ).rejects.toHaveProperty('message', 'No credentials found for user');
    });

    it('fails when the account is not found', async () => {
      authService = new AuthService(
        instance(credentialRepository),
        {} as any,
        {
          auth: {
            google: {},
          },
        } as Configuration,
      );

      await expect(authService.validateUserGoogle(context, profile)).rejects.toHaveProperty(
        'message',
        'No credentials found for user',
      );
    });

    it('will not create an account if the domain is not allowed', async () => {
      configuration.auth = {
        google: {
          signUpEnabled: true,
          signUpDomains: ['test.com'],
          clientId: '',
          secret: '',
        },
      };

      await expect(authService.validateUserGoogle(context, profile)).rejects.toHaveProperty(
        'message',
        'No credentials found for user',
      );
    });

    it('creates an account when creation is enabled', async () => {
      configuration.auth = {
        google: {
          signUpEnabled: true,
          signUpDomains: ['example.com'],
          signUpRoles: ['user'],
          clientId: '',
          secret: '',
        },
      };

      const expectedResult = {
        email: 'test@example.com',
        name: 'test',
        roles: ['user'],
        enabled: true,
      };
      await expect(authService.validateUserGoogle(context, profile)).resolves.toMatchObject(expectedResult);
    });

    it('fails when the backing user is not enabled', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'google',
        userId: '12345',
        id: 'test@example.com',
      });
      when(userService.get(context, '12345')).thenResolve({ id: '12345', enabled: false });
      configuration.auth = {
        google: {
          signUpEnabled: true,
          signUpDomains: ['example.com'],
          signUpRoles: ['user '],
          clientId: '',
          secret: '',
        },
      };

      await expect(authService.validateUserGoogle(context, profile)).rejects.toHaveProperty(
        'message',
        'User account is disabled',
      );
    });

    it('returns the user when validation succeeded', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'google',
        userId: '12345',
        id: 'test@example.com',
      });
      const existingUser = { id: '12345', enabled: true };
      when(userService.get(context, '12345')).thenResolve(existingUser);
      configuration.auth = {
        google: {
          signUpEnabled: true,
          signUpDomains: ['example.com'],
          signUpRoles: ['user '],
          clientId: '',
          secret: '',
        },
      };

      await expect(authService.validateUserGoogle(context, profile)).resolves.toEqual(existingUser);
    });
  });

  describe('validateUserOidc', () => {
    let profile: any;
    beforeEach(() => {
      profile = {
        login: 'john.smith',
        email: 'test@example.com',
        displayName: 'John Smith',
      };
    });

    it('creates a new enabled user with default roles when no existing account found', async () => {
      when(credentialRepository.get(context, anything())).thenResolve(undefined);
      await expect(authService.validateUserOidc(context, profile, true, ['default-role'])).resolves.toEqual({
        email: 'test@example.com',
        name: 'John Smith',
        roles: ['default-role'],
        enabled: true,
      });
      verify(credentialRepository.save(context, anything())).once();
    });

    it('updates existing users name when found', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'oidc',
        userId: '12345',
        id: 'test@example.com',
      });
      const existingUser = { id: '12345', enabled: true };
      when(userService.get(context, '12345')).thenResolve(existingUser);

      await expect(authService.validateUserOidc(context, profile, true, ['default-role'])).resolves.toEqual({
        ...existingUser,
        name: 'John Smith',
      });

      verify(userService.update(context, anything(), anything())).once();
    });

    it('updates existing users name when existing user found case insensitive search', async () => {
      profile.email = 'TeST@EXAMPLE.com';
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'oidc',
        userId: '12345',
        id: 'test@example.com',
      });
      const existingUser = { id: '12345', enabled: true };
      when(userService.get(context, '12345')).thenResolve(existingUser);

      await expect(authService.validateUserOidc(context, profile, true, ['default-role'])).resolves.toEqual({
        ...existingUser,
        name: 'John Smith',
      });

      verify(userService.update(context, anything(), anything())).once();
    });

    it('updates credentials when the stored authentication type does not match and replaceAuth is set to true', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'google',
        userId: '12345',
        id: 'test@example.com',
      });
      const existingUser = { id: '12345', enabled: true };
      when(userService.get(context, '12345')).thenResolve(existingUser);

      await expect(authService.validateUserOidc(context, profile, true, ['default-role'])).resolves.toEqual({
        ...existingUser,
        name: 'John Smith',
      });

      verify(
        credentialRepository.save(
          context,
          objectContaining({
            type: 'oidc',
            userId: '12345',
            id: 'test@example.com',
          }),
        ),
      ).once();
    });

    it('fails when the stored authentication type does not match and replaceAuth is set to false', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'google',
        userId: '12345',
        id: 'test@example.com',
      });
      await expect(authService.validateUserOidc(context, profile, false)).rejects.toHaveProperty(
        'message',
        'No credentials found for user',
      );
    });

    it('fails when stored credentials exist but user not found', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'oidc',
        userId: '12345',
        id: 'test@example.com',
      });
      when(userService.get(context, '12345')).thenResolve(null);
      await expect(authService.validateUserOidc(context, profile, true)).rejects.toHaveProperty(
        'message',
        'User not found',
      );
    });

    it('fails when stored credentials and user exist but user not enabled', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'oidc',
        userId: '12345',
        id: 'test@example.com',
      });
      when(userService.get(context, '12345')).thenResolve({ id: '12345', enabled: false });
      await expect(authService.validateUserOidc(context, profile, true)).rejects.toHaveProperty(
        'message',
        'User account is disabled',
      );
    });
  });

  describe('validateFakeLogin', () => {
    beforeEach(() => {
      configuration.isDevelopment = () => true;
    });

    it('creates new enabled user when user does not exist', async () => {
      when(userService.getByEmail(context, 'test@example.com')).thenResolve(undefined);
      await expect(authService.validateFakeLogin(context, 'test@example.com', 'John Smith', ['user'])).resolves.toEqual(
        {
          email: 'test@example.com',
          name: 'John Smith',
          roles: ['user'],
          enabled: true,
        },
      );
      verify(userService.create(context, anything())).once();
    });

    it('fails when user exists but is not enabled', async () => {
      const existingUser = {
        id: '1234',
        email: 'test@example.com',
        name: 'Previous Name',
        roles: ['user', 'admin'],
        enabled: false,
      };
      when(userService.getByEmail(context, 'test@example.com')).thenResolve(existingUser);
      await expect(
        authService.validateFakeLogin(context, 'test@example.com', 'John Smith', ['user']),
      ).rejects.toHaveProperty('message', 'User account is disabled');
    });

    it('updates user when user exists', async () => {
      const existingUser = {
        id: '1234',
        email: 'test@example.com',
        name: 'Previous Name',
        roles: ['user', 'admin'],
        enabled: true,
      };
      when(userService.getByEmail(context, 'test@example.com')).thenResolve(existingUser);
      await expect(authService.validateFakeLogin(context, 'test@example.com', 'John Smith', ['user'])).resolves.toEqual(
        {
          ...existingUser,
          name: 'John Smith',
          roles: ['user'],
        },
      );
      verify(userService.update(context, '1234', anything())).once();
    });

    it('fails when server is not in development mode', async () => {
      configuration.isDevelopment = () => false;

      await expect(
        authService.validateFakeLogin(context, 'test@example.com', 'John Smith', ['user']),
      ).rejects.toHaveProperty('message', 'No credentials found for user');
    });
  });
});
