import { ConfigurationProvider } from '../../config/config.provider';
import { Context } from '../../datastore/context';
import { DatastoreLoader } from '../../datastore/loader';
import { User, UserRepository } from '../../users/users.repository';
import { CredentialRepository } from '../auth.repository';
import { AuthService, hashPassword } from '../auth.service';
import {
  anyFunction,
  capture,
  instance,
  mock,
  notNull,
  reset,
  when,
} from 'ts-mockito';
import * as _ from 'lodash';

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
  const userRepository = mock(UserRepository);
  const configurationProvider = mock(ConfigurationProvider);
  const authService = new AuthService(
    instance(credentialRepository),
    instance(userRepository),
    instance(configurationProvider),
  );
  const context = mockContext();

  beforeEach(() => {
    reset(credentialRepository);
    reset(userRepository);
    reset(configurationProvider);
  });

  describe('validateUser', () => {
    it('should throw an error if account does not exist', async () => {
      await expect(
        authService.validateUser(context, 'username', 'password'),
      ).rejects.toHaveProperty('message', 'CredentialsNotFoundError');
    });

    it('should throw an error if the account is not associated with a password', async () => {
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
      when(credentialRepository.get(context, 'username')).thenResolve({
        type: 'password',
        userId: '12345',
        id: 'username',
        password: await hashPassword('password'),
      });

      const user = { id: '12345' } as User;

      when(userRepository.get(context, '12345')).thenResolve(user);

      await expect(
        authService.validateUser(context, 'username', 'password'),
      ).resolves.toBe(user);
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
      await expect(
        authService.validateUserGoogle(context, _.omit(profile, 'id')),
      ).rejects.toHaveProperty(
        'message',
        'Expecting string at id but instead got: undefined.',
      );
    });

    it('should fail if there are no matching email addresses', async () => {
      await expect(
        authService.validateUserGoogle(context, {
          ...profile,
          emails: [],
        }),
      ).rejects.toHaveProperty('message', 'CredentialsNotFoundError');
    });

    it('should fail if the account if not found', async () => {
      await expect(
        authService.validateUserGoogle(context, profile),
      ).rejects.toHaveProperty('message', 'CredentialsNotFoundError');
    });

    it('should not create an account if the domain is not allowed', async () => {
      when(configurationProvider.googleOAuthSignUpEnabled).thenReturn(true);
      when(configurationProvider.googleOAuthSignUpDomains).thenReturn([
        'test.com',
      ]);
      when(configurationProvider.googleOAuthSignUpRoles).thenReturn(['user']);

      when(userRepository.save(context, notNull())).thenCall((ctx, u) => u);

      await expect(
        authService.validateUserGoogle(context, profile),
      ).rejects.toHaveProperty('message', 'CredentialsNotFoundError');
    });

    it('should create an account if creation is enabled', async () => {
      when(configurationProvider.googleOAuthSignUpEnabled).thenReturn(true);
      when(configurationProvider.googleOAuthSignUpDomains).thenReturn([
        'example.com',
      ]);
      when(configurationProvider.googleOAuthSignUpRoles).thenReturn(['user']);

      when(userRepository.save(context, notNull())).thenCall((ctx, u) => u);

      const expectedResult = {
        email: 'test@example.com',
        name: 'test',
        roles: ['user'],
      };
      await expect(
        authService.validateUserGoogle(context, profile),
      ).resolves.toMatchObject(expectedResult);

      const [, result] = capture(userRepository.save).last();

      expect(result).toMatchObject(expectedResult);
    });

    it('should return the user if validation succeeded', async () => {
      when(credentialRepository.get(context, 'test@example.com')).thenResolve({
        type: 'google',
        userId: '12345',
        id: 'test@example.com',
      });

      const user = { id: '12345' } as User;

      when(userRepository.get(context, '12345')).thenResolve(user);

      await expect(
        authService.validateUserGoogle(context, profile),
      ).resolves.toBe(user);
    });
  });
});
