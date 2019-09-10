import { omit } from 'lodash';
import { anyFunction, anything, instance, mock, reset, verify, when } from 'ts-mockito';
import { Configuration } from '../../configuration';
import { Context } from '../../datastore/context';
import { DatastoreLoader } from '../../datastore/loader';
import { CredentialRepository } from '../auth.repository';
import { AuthService, hashPassword, UserNotFoundError } from '../auth.service';
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
        'CredentialsNotFoundError',
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
        'CredentialsNotFoundError',
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
        'PasswordInvalidError',
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
        'UserNotFoundError',
      );
    });

    it('returns the user when validation succeeded', async () => {
      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'password',
        userId: '12345',
        id: 'username',
        password: await hashPassword('password'),
      });
      when(userService.get(context, anything())).thenResolve({ id: '12345' });

      await expect(authService.validateUser(context, 'username', 'password')).resolves.toEqual({
        id: '12345',
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
      ).rejects.toHaveProperty('message', 'CredentialsNotFoundError');
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
        'CredentialsNotFoundError',
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
        'CredentialsNotFoundError',
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
      };
      await expect(authService.validateUserGoogle(context, profile)).resolves.toMatchObject(expectedResult);
    });

    it('returns the user when validation succeeded', async () => {
      when(userService.get(context, anything())).thenResolve({ id: '12345' });
      configuration.auth = {
        google: {
          signUpEnabled: true,
          signUpDomains: ['example.com'],
          signUpRoles: ['user '],
          clientId: '',
          secret: '',
        },
      };

      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'google',
        userId: '12345',
        id: 'test@example.com',
      });

      await expect(authService.validateUserGoogle(context, profile)).resolves.toEqual({ id: '12345' });
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

    it('creates a new user with default roles when no existing account found', async () => {
      when(credentialRepository.get(context, anything())).thenResolve(undefined);
      await expect(authService.validateUserOidc(context, profile, ['default-role'])).resolves.toEqual({
        email: 'test@example.com',
        name: 'John Smith',
        roles: ['default-role'],
      });
      verify(credentialRepository.save(context, anything())).once();
    });

    it('updates existing user name when found', async () => {
      when(credentialRepository.get(context, anything())).thenResolve({
        type: 'oidc',
        userId: '12345',
        id: 'test@example.com',
      });
      const existingUser = { id: '12345' };
      when(userService.get(context, anything())).thenResolve(existingUser);

      await expect(authService.validateUserOidc(context, profile, ['default-role'])).resolves.toEqual({
        id: '12345',
        name: 'John Smith',
      });

      verify(userService.update(context, anything(), anything())).once();
    });

    it('fails when the stored authentication type does not match', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'google',
        userId: '12345',
        id: 'test@example.com',
      });
      await expect(authService.validateUserOidc(context, profile)).rejects.toHaveProperty(
        'message',
        'CredentialsNotFoundError',
      );
    });

    it('fails when stored credentials exist but user not found', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'oidc',
        userId: '12345',
        id: 'test@example.com',
      });
      when(userService.get(context, anything())).thenResolve(null);
      await expect(authService.validateUserOidc(context, profile)).rejects.toHaveProperty(
        'message',
        'UserNotFoundError',
      );
    });
  });
});
