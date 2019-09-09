import { Context, IUser, IUserUpdates } from '../../datastore/context';
import { DatastoreLoader } from '../../datastore/loader';
import { CredentialRepository } from '../auth.repository';
import { AuthService, hashPassword } from '../auth.service';
import { anyFunction, instance, mock, reset, when } from 'ts-mockito';
import { Configuration } from '../../configuration';
import { UserService } from '../user.service';
import { omit } from 'lodash';

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
  let configuration: Configuration;
  let authService: AuthService;
  let userService: UserService<any>;

  beforeEach(() => {
    reset(credentialRepository);
    configuration = {} as Configuration;
    userService = {
      create: async (_: any, user: any) => user,
    } as UserService<any>;
    authService = new AuthService(instance(credentialRepository), userService, configuration);
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
      userService.get = async () => null;
      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'password',
        userId: '12345',
        id: 'username',
        password: await hashPassword('password'),
      });

      await expect(authService.validateUser(context, 'username', 'password')).rejects.toHaveProperty(
        'message',
        'UserNotFoundError',
      );
    });

    it('returns the user when validation succeeded', async () => {
      userService.get = async () => ({ id: '12345' });
      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'password',
        userId: '12345',
        id: 'username',
        password: await hashPassword('password'),
      });

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
      userService.get = async () => ({ id: '12345' });
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
});
