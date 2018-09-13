import { Context } from '../../datastore/context';
import { DatastoreLoader } from '../../datastore/loader';
import { CredentialRepository } from '../auth.repository';
import { AuthService, hashPassword } from '../auth.service';
import {
  anyFunction,
  instance,
  mock,
  reset,
  when,
} from 'ts-mockito';
import * as _ from 'lodash';
import { Configuration } from '../../configuration';
import { UserService } from '../user.service';

export const mockContext = () => {
  const datastoreLoader = mock(DatastoreLoader);

  const context = {
    datastore: instance(datastoreLoader),
  } as Context;

  when(datastoreLoader.inTransaction(anyFunction())).thenCall((cb: any) =>
    cb(context),
  );

  return context;
};

describe('AuthService', () => {
  const credentialRepository = mock(CredentialRepository);
  const context = mockContext();

  beforeEach(() => {
    reset(credentialRepository);
  });

  describe('validateUser', () => {
    it('should throw an error if account does not exist', async () => {
      const authService = new AuthService(
        instance(credentialRepository),
        {} as UserService<any>,
        {} as Configuration,
      );

      await expect(
        authService.validateUser(context, 'username', 'password'),
      ).rejects.toHaveProperty('message', 'CredentialsNotFoundError');
    });

    it('should throw an error if the account is not associated with a password', async () => {
      const authService = new AuthService(
        instance(credentialRepository),
        {} as UserService<any>,
        {} as Configuration,
      );

      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'google',
        userId: '12345',
        id: 'username',
      });

      await expect(
        authService.validateUser(context, 'username', 'password'),
      ).rejects.toHaveProperty('message', 'CredentialsNotFoundError');
    });

    it('should throw an error if the password does not match', async () => {
      const authService = new AuthService(
        instance(credentialRepository),
        {} as UserService<any>,
        {} as Configuration,
      );

      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'password',
        userId: '12345',
        id: 'username',
        password: await hashPassword('abc123'),
      });

      await expect(
        authService.validateUser(context, 'username', 'password'),
      ).rejects.toHaveProperty('message', 'PasswordInvalidError');
    });

    it('should throw an error if the backing user does not exist', async () => {
      const authService = new AuthService(
        instance(credentialRepository),
        {
          get: () => null,
        } as any,
        {} as Configuration,
      );

      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'password',
        userId: '12345',
        id: 'username',
        password: await hashPassword('password'),
      });

      await expect(
        authService.validateUser(context, 'username', 'password'),
      ).rejects.toHaveProperty('message', 'UserNotFoundError');
    });

    it('should return the user if validation succeeded', async () => {
      const authService = new AuthService(
        instance(credentialRepository),
        {
          get: () => ({ id: '12345' }),
        } as any,
        {} as Configuration,
      );

      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'password',
        userId: '12345',
        id: 'username',
        password: await hashPassword('password'),
      });

      await expect(
        authService.validateUser(context, 'username', 'password'),
      ).resolves.toEqual({
        id: '12345'
      });
    });
  });

  describe('validateUserGoogle', () => {
    const profile = {
      id: '12345',
      emails: [
        {
          type: 'account',
          value: 'test@example.com',
        },
      ],
      displayName: 'test',
    };

    it('should fail if the profile does not match the expected format', async () => {
      const authService = new AuthService(
        instance(credentialRepository),
        {} as any,
        {} as Configuration,
      );

      await expect(
        authService.validateUserGoogle(context, _.omit(profile, 'id')),
      ).rejects.toHaveProperty(
        'message',
        'Expecting string at id but instead got: undefined.',
      );
    });

    it('should fail if there are no matching email addresses', async () => {
      const authService = new AuthService(
        instance(credentialRepository),
        {} as any,
        {} as Configuration,
      );

      await expect(
        authService.validateUserGoogle(context, {
          ...profile,
          emails: [],
        }),
      ).rejects.toHaveProperty('message', 'CredentialsNotFoundError');
    });

    it('should fail if the account if not found', async () => {
      const authService = new AuthService(
        instance(credentialRepository),
        {} as any,
        {
          auth: {
            google: {}
          }
        } as Configuration,
      );

      await expect(
        authService.validateUserGoogle(context, profile),
      ).rejects.toHaveProperty('message', 'CredentialsNotFoundError');
    });

    it('should not create an account if the domain is not allowed', async () => {
      const authService = new AuthService(
        instance(credentialRepository),
        {
          save: (_: any, user: any) => user
        } as any,
        {
          auth: {
            google: {
              signUpEnabled: true,
              signUpDomains: [ 'test.com' ]
            }
          }
        } as Configuration,
      );

      await expect(
        authService.validateUserGoogle(context, profile),
      ).rejects.toHaveProperty('message', 'CredentialsNotFoundError');
    });

    it('should create an account if creation is enabled', async () => {
      const authService = new AuthService(
        instance(credentialRepository),
        {
          create: (_: any, user: any) => user
        } as any,
        {
          auth: {
            google: {
              signUpEnabled: true,
              signUpDomains: [ 'example.com' ],
              signUpRoles: [ 'user' ]
            }
          }
        } as Configuration,
      );

      const expectedResult = {
        email: 'test@example.com',
        name: 'test',
        roles: ['user'],
      };
      await expect(
        authService.validateUserGoogle(context, profile),
      ).resolves.toMatchObject(expectedResult);
    });

    it('should return the user if validation succeeded', async () => {
      const authService = new AuthService(
        instance(credentialRepository),
        {
          save: (_: any, user: any) => user,
          get: () => ({ id: '12345' })
        } as any,
        {
          auth: {
            google: {
              signUpEnabled: true,
              signUpDomains: [ 'example.com' ],
              signUpRoles: [ 'user ']
            }
          }
        } as Configuration,
      );

      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'google',
        userId: '12345',
        id: 'test@example.com',
      });

      await expect(
        authService.validateUserGoogle(context, profile),
      ).resolves.toEqual({ id: '12345' });
    });
  });
});
