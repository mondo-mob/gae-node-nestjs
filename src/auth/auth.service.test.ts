import { omit } from 'lodash';
import { anyFunction, anything, instance, mock, objectContaining, reset, verify, when } from 'ts-mockito';
import { Configuration } from '../configuration';
import { CredentialRepository } from './auth.repository';
import { AuthService, hashPassword } from './auth.service';
import { AbstractUserService } from './user.service';
import { AuthCallbacks } from './auth.callbacks';
import { mockContext } from '../_test/mocks';

describe('AuthService', () => {
  const credentialRepository = mock(CredentialRepository);
  const context = mockContext();
  const userService = mock(AbstractUserService);
  const authCallbacks: AuthCallbacks = {} as AuthCallbacks;
  let configuration: Configuration;
  let authService: AuthService;

  beforeEach(() => {
    reset(credentialRepository);
    reset(userService);
    configuration = { auth: {} } as Configuration;
    when(userService.create(anything(), anything())).thenCall(async (_: any, user: any) => user);
    when(userService.createOrUpdate(anything(), anything(), anyFunction())).thenCall(async (_: any, user: any) => user);
    when(userService.update(anything(), anything(), anything())).thenCall(async (_: any, _id: any, user: any) => user);
    authService = new AuthService(instance(credentialRepository), instance(userService), configuration, authCallbacks);
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
        'Expecting string at id but instead got: undefined',
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
        {} as AuthCallbacks,
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

    it('creates or updates enabled user with default roles when no existing account found', async () => {
      when(credentialRepository.get(context, anything())).thenResolve(undefined);
      await expect(authService.validateUserOidc(context, profile, true)).resolves.toEqual({
        email: 'test@example.com',
        name: 'John Smith',
        roles: [],
        props: {},
        enabled: true,
      });
      verify(userService.createOrUpdate(context, anything(), anyFunction())).once();
      verify(credentialRepository.save(context, anything())).once();
    });

    it('updates existing users name when found', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'oidc',
        userId: '12345',
        id: 'test@example.com',
      });
      const existingUser = { id: '12345', enabled: true, props: {}, roles: [] };
      when(userService.get(context, '12345')).thenResolve(existingUser);

      await expect(authService.validateUserOidc(context, profile, true)).resolves.toEqual({
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
      const existingUser = { id: '12345', enabled: true, props: {}, roles: [] };
      when(userService.get(context, '12345')).thenResolve(existingUser);

      await expect(authService.validateUserOidc(context, profile, true)).resolves.toEqual({
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
      const existingUser = { id: '12345', enabled: true, props: {}, roles: [] };
      when(userService.get(context, '12345')).thenResolve(existingUser);

      await expect(authService.validateUserOidc(context, profile, true)).resolves.toEqual({
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
      configuration.auth.fake = {
        enabled: true,
        secret: 'ABCD1234',
      };
    });

    it('creates new enabled user when user does not exist', async () => {
      when(userService.getByEmail(context, 'test@example.com')).thenResolve(undefined);
      await expect(
        authService.validateFakeLogin(context, 'ABCD1234', 'test@example.com', 'John Smith', ['user'], 'org1', {}),
      ).resolves.toEqual({
        email: 'test@example.com',
        name: 'John Smith',
        roles: ['user'],
        enabled: true,
        orgId: 'org1',
        props: {},
      });
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
        authService.validateFakeLogin(context, 'ABCD1234', 'test@example.com', 'John Smith', ['user'], 'org1', {}),
      ).rejects.toHaveProperty('message', 'User account is disabled');
    });

    it('updates user when user exists', async () => {
      const existingUser = {
        id: '1234',
        email: 'test@example.com',
        name: 'Previous Name',
        roles: ['user', 'admin'],
        enabled: true,
        orgId: 'org1',
        props: { prop1: 'val1' },
      };
      when(userService.getByEmail(context, 'test@example.com')).thenResolve(existingUser);
      await expect(
        authService.validateFakeLogin(context, 'ABCD1234', 'test@example.com', 'John Smith', ['user'], 'org2', {
          prop1: 'val2',
        }),
      ).resolves.toEqual({
        ...existingUser,
        name: 'John Smith',
        roles: ['user'],
        orgId: 'org2',
        props: { prop1: 'val2' },
      });
      verify(userService.update(context, '1234', anything())).once();
    });

    it('does not check secret when not defined in config', async () => {
      configuration.auth.fake!.secret = undefined;
      when(userService.getByEmail(context, 'test@example.com')).thenResolve(undefined);
      await expect(
        authService.validateFakeLogin(context, 'ABCD1234', 'test@example.com', 'John Smith', ['user'], 'org1', {}),
      ).resolves.toEqual({
        email: 'test@example.com',
        name: 'John Smith',
        roles: ['user'],
        enabled: true,
        orgId: 'org1',
        props: {},
      });
      verify(userService.create(context, anything())).once();
    });

    it('fails when secret defined but does not match', async () => {
      await expect(
        authService.validateFakeLogin(context, 'ThisIsWrong', 'test@example.com', 'John Smith', ['user'], 'org1', {}),
      ).rejects.toHaveProperty('message', 'Fake login secret invalid');
    });

    it('fails when secret defined but not supplied', async () => {
      await expect(
        authService.validateFakeLogin(context, undefined, 'test@example.com', 'John Smith', ['user'], 'org1', {}),
      ).rejects.toHaveProperty('message', 'Fake login secret invalid');
    });
  });
});
