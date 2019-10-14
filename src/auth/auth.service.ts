import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as Logger from 'bunyan';
import * as emails from 'email-addresses';
import * as t from 'io-ts';
import { reporter } from 'io-ts-reporters';
import { isNil } from 'lodash';
import { CONFIGURATION } from '../configuration';
import { Context, IUserCreateRequest } from '../datastore/context';
import { Transactional } from '../datastore/transactional';
import { createLogger } from '../gcloud/logging';
import { Configuration, IUser, normaliseEmail } from '../index';
import { CredentialRepository, ExternalAuthType, LoginCredentials } from './auth.repository';
import { USER_SERVICE, UserService } from './user.service';

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

export class UserNotEnabledError extends HttpException {
  constructor() {
    super('UserNotEnabledError', HttpStatus.FORBIDDEN);
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
    const account = await this.getAccountByEmail(context, username);

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

    return await this.loadUserAndCheckEnabled(context, account.userId);
  }

  @Transactional()
  async validateFakeLogin(context: Context, email: string, name: string, roles: string[], orgId: string, props: any) {
    if (!this.configurationProvider.isDevelopment()) {
      this.logger.error('Fake login is only available for local dev');
      throw new CredentialsNotFoundError();
    }

    const user = await this.userService.getByEmail(context, email);

    if (user) {
      if (!user.enabled) {
        throw new UserNotEnabledError();
      }
      return await this.userService.update(context, user.id, {
        ...user,
        name,
        roles,
        orgId,
        props,
      });
    } else {
      return await this.userService.create(context, {
        email,
        name,
        roles,
        orgId,
        props,
        enabled: true,
      });
    }
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
    const account = await this.getAccountByEmail(context, email);

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
        enabled: true,
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

    return await this.loadUserAndCheckEnabled(context, account.userId);
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
  async validateUserSaml(context: Context, profile: SimpleUserProfile): Promise<IUser> {
    return this.validateOrCreateExternalAuthAccount(context, profile.email, {
      type: 'saml',
      newUserRequest: () => ({
        roles: [],
        email: profile.email,
        name: this.toName(profile),
        enabled: true,
      }),
    });
  }

  @Transactional()
  async validateUserOidc(
    context: Context,
    profile: any,
    overwriteCredentials: boolean,
    newUserRoles: string[] = [],
  ): Promise<IUser> {
    // tslint:disable-next-line:no-string-literal
    const profileJson = (profile as any)['_json'];
    const email = profile.email || (profileJson && profileJson.email);
    return this.validateOrCreateExternalAuthAccount(context, email, {
      type: 'oidc',
      overwriteCredentials,
      newUserRequest: () => ({
        email,
        name: profile.displayName,
        roles: newUserRoles,
        enabled: true,
      }),
      updateUser: user => {
        return this.userService.update(context, user.id, {
          ...user,
          name: profile.displayName,
        });
      },
    });
  }

  @Transactional()
  async validateUserAuth0(context: Context, email: string, name: string, orgId: string, roles: string[], props: any) {
    return this.validateOrCreateExternalAuthAccount(context, email, {
      type: 'auth0',
      newUserRequest: () => ({
        roles,
        orgId,
        email,
        name,
        props,
        enabled: true,
      }),
      updateUser: user => {
        user.name = name;
        user.roles = roles;
        user.orgId = orgId;
        user.props = props;
        return this.userService.update(context, user.id, user);
      },
    });
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
    const existingCredentials = await this.getAccountByEmail(context, email);

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

  private async validateOrCreateExternalAuthAccount(
    context: Context,
    email: string,
    options: ValidateOptions,
  ): Promise<IUser> {
    const { newUserRequest, updateUser, type } = options;
    this.logger.info(`Validating ${type} user profile`);

    const account = await this.getAccountByEmail(context, email);

    if (!account) {
      this.logger.info(`No account found for ${email}, creating it.`);

      const createdUser = await this.userService.create(context, newUserRequest());

      await this.authRepository.save(context, {
        id: email,
        type,
        userId: createdUser.id,
      });

      return createdUser;
    }

    if (!options.overwriteCredentials && account.type !== type) {
      throw new CredentialsNotFoundError();
    }

    const user = await this.loadUserAndCheckEnabled(context, account.userId);

    if (account.type !== type) {
      this.logger.info(`Updating auth type to [${type}] for [${email}]`);
      await this.authRepository.save(context, {
        id: account.id,
        type,
        userId: account.userId,
      });
    }

    this.logger.info(`User ${email} validated`);
    return updateUser ? await updateUser(user) : user;
  }

  private async loadUserAndCheckEnabled(context: Context, userId: string) {
    const user = await this.userService.get(context, userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    if (!user.enabled) {
      throw new UserNotEnabledError();
    }

    return user;
  }

  private getAccountByEmail(context: Context, email: string) {
    const normalisedEmail = normaliseEmail(email);
    this.logger.info(`Looking up user by email ${normalisedEmail}`);
    return this.authRepository.get(context, normalisedEmail);
  }

  private toName(profile: SimpleUserProfile) {
    return [profile.firstName, profile.lastName].filter(part => !isNil(part)).join(' ');
  }
}

export interface SimpleUserProfile {
  email: string;
  firstName?: string;
  lastName?: string;
}

interface ValidateOptions {
  type: ExternalAuthType;
  overwriteCredentials?: boolean;
  newUserRequest: () => IUserCreateRequest;
  updateUser?: (existing: IUser) => Promise<IUser>;
}
