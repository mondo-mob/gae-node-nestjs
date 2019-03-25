import { Inject, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as Logger from 'bunyan';
import * as t from 'io-ts';
import * as uuid from 'node-uuid';
import * as bcrypt from 'bcryptjs';
import * as emails from 'email-addresses';
import { CredentialRepository, LoginCredentials } from './auth.repository';
import { reporter } from 'io-ts-reporters';
import { USER_SERVICE, UserService } from './user.service';
import { Configuration, IUser } from '../index';
import { Transactional } from '../datastore/transactional';
import { createLogger } from '../gcloud/logging';
import { Context } from '../datastore/context';
import { CONFIGURATION } from '../configuration';

const userProfile = t.interface({
  id: t.string, // username
  emails: t.array(
    t.interface({
      value: t.string,
      verified: t.boolean,
    }),
  ),
  displayName: t.string,
});

export class UserNotFoundError extends HttpException {
  constructor() {
    super('UserNotFoundError', HttpStatus.FORBIDDEN);
  }
}
export class CredentialsNotFoundError extends HttpException {
  constructor() {
    super('CredentialsNotFoundError', HttpStatus.FORBIDDEN);
  }
}
export class PasswordInvalidError extends HttpException {
  constructor() {
    super('PasswordInvalidError', HttpStatus.FORBIDDEN);
  }
}

const PASSWORD_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, PASSWORD_ROUNDS);
}

@Injectable()
export class AuthService {
  private readonly logger: Logger;

  constructor(
    private readonly authRepository: CredentialRepository,
    @Inject(USER_SERVICE) private readonly userService: UserService<IUser>,
    @Inject(CONFIGURATION) private readonly configurationProvider: Configuration,
  ) {
    this.logger = createLogger('account-service');
  }

  /**
   * Validate a user using stored credentials
   *
   * Password is compared using bcrypt to the existing account's password (if it exists).
   *
   * @param context Request context
   * @param username The username for the account TODO: Rename to email
   * @param password The users password
   */
  async validateUser(context: Context, username: string, password: string): Promise<IUser> {
    const account = await this.authRepository.get(context, username);

    if (!account) {
      throw new CredentialsNotFoundError();
    }

    if (account.type !== 'password') {
      throw new CredentialsNotFoundError();
    }

    const result = await bcrypt.compare(password, account.password);

    if (!result) {
      throw new PasswordInvalidError();
    }

    const user = await this.userService.get(context, account.userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    return user;
  }

  /**
   * Validate a user using credentials from a google account
   *
   * If the user does not currently have an account their account will be created provided the googleOAuthSignUpEnabled
   *  flag is enabled. If an account is created via google signup then they will be given roles from the
   *  googleOAuthSignUpRoles configuration option
   *
   * @param context Request context
   * @param inputProfile The profile returned from Google
   */
  @Transactional()
  async validateUserGoogle(context: Context, inputProfile: object): Promise<IUser> {
    const validationResult = userProfile.decode(inputProfile);

    if (validationResult.isLeft()) {
      throw new Error(reporter(validationResult).join(', '));
    }

    const profile = validationResult.value;
    const accountEmails = profile.emails.find(accountEmail => accountEmail.verified);

    if (!accountEmails) {
      throw new CredentialsNotFoundError();
    }

    const email = accountEmails.value;
    const account = await this.authRepository.get(context, email);

    // If there is no account registered there are two options:
    // 1. Create an account for the user (if we allow signup via google auth)
    // 2. Throw an error
    //
    // Accounts created via google auth have the default roles list
    if (!account) {
      if (!this.configurationProvider.auth.google || !this.configurationProvider.auth.google.signUpEnabled) {
        throw new CredentialsNotFoundError();
      }

      const { domain } = emails.parseOneAddress(email) as emails.ParsedMailbox;

      const signUpDomains = this.configurationProvider.auth.google.signUpDomains || [];
      if (!signUpDomains.includes(domain)) {
        throw new CredentialsNotFoundError();
      }

      const createdUser = await this.userService.create(context, {
        roles: this.configurationProvider.auth.google.signUpRoles,
        email,
        name: profile.displayName,
      });

      await this.authRepository.save(context, {
        id: email,
        type: 'google',
        userId: createdUser.id,
      });

      return createdUser;
    }

    if (account.type !== 'google' && account.type !== 'password') {
      throw new CredentialsNotFoundError();
    }

    const user = await this.userService.get(context, account.userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    return user;
  }

  /**
   * Validate a user using credentials from a SAML Identify Provider.
   *
   * If the user does not currently have an account their account will be created provided.
   *
   * @param context Request context
   * @param profile The profile returned from SAML
   */
  @Transactional()
  async validateUserSaml(context: Context, profile: any): Promise<IUser> {
    this.logger.info('Validating SAML user profile');

    const email = profile.email;
    this.logger.info(`Looking up user by email ${email}`);
    const account = await this.authRepository.get(context, email);

    if (!account) {
      this.logger.info('No account found, creating it.');

      const createdUser = await this.userService.create(context, {
        roles: [],
        email,
        name: `${profile.firstName} ${profile.lastName}`,
      });

      await this.authRepository.save(context, {
        id: profile.email,
        type: 'saml',
        userId: createdUser.id,
      });

      return createdUser;
    }

    if (account.type !== 'saml') {
      throw new CredentialsNotFoundError();
    }

    const user = await this.userService.get(context, account.userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    return user;
  }

  @Transactional()
  async validateUserAuth0(context: Context, email: string, orgId: string, roles: string[], props: any) {
    this.logger.info('Validating Auth0 user profile');

    this.logger.info(`Looking up user by email ${email}`);
    const account = await this.authRepository.get(context, email);

    if (!account) {
      this.logger.info('No account found, creating it.');

      const createdUser = await this.userService.create(context, {
        roles,
        orgId,
        email,
        props,
      });

      await this.authRepository.save(context, {
        id: email,
        type: 'auth0',
        userId: createdUser.id,
      });

      return createdUser;
    }

    if (account.type !== 'auth0') {
      throw new CredentialsNotFoundError();
    }

    const user = await this.userService.get(context, account.userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    user.roles = roles;
    user.orgId = orgId;
    user.props = props;
    await this.userService.update(context, user.id, user);

    return user;
  }

  /**
   * Create a new user account
   *
   * If an account already exists for the provided email address it will be returned instead
   *
   * @param context Request context
   * @param email The account
   * @param password The password to use
   * @param account The user id to use for this set of credentials
   */
  @Transactional()
  async createAccount(context: Context, email: string, password: string, account: string): Promise<LoginCredentials> {
    const existingCredentials = await this.authRepository.get(context, email);

    if (!existingCredentials) {
      return await this.authRepository.save(context, {
        id: email,
        password: await hashPassword(password),
        userId: account,
        type: 'password',
      });
    }

    return existingCredentials;
  }
}
