import * as Logger from 'bunyan';
import { Context, createLogger, IUser, IUserCreateRequest, IUserUpdates, Transactional } from '..';
import { LoginIdentifierRepository } from './login-identifier.repository';

export const USER_SERVICE = 'UserService';

export const normaliseEmail = (email: string) => email.toLowerCase();

export interface UserService<
  T extends IUser,
  U extends IUserUpdates = IUserUpdates,
  C extends IUserCreateRequest = IUserCreateRequest
> {
  getByEmail(context: Context, email: string): Promise<T | undefined>;
  get(context: Context, userId: string): Promise<T | undefined>;
  create(context: Context, user: C): Promise<T>;
  update(context: Context, id: string, updates: U): Promise<T>;
}

export abstract class AbstractUserService<
  T extends IUser,
  U extends IUserUpdates = IUserUpdates,
  C extends IUserCreateRequest = IUserCreateRequest
> implements UserService<T, U, C> {
  private readonly baseLogger: Logger;

  protected constructor(protected readonly loginIdentifierRepository: LoginIdentifierRepository) {
    this.baseLogger = createLogger('abstract-user-service');
  }

  abstract get(context: Context, userId: string): Promise<T | undefined>;
  protected abstract createUser(context: Context, user: IUserCreateRequest): Promise<T>;
  protected abstract updateUser(context: Context, user: T, updates: U): Promise<T>;

  async getByEmail(context: Context, email: string) {
    const loginIdentifier = await this.loginIdentifierRepository.get(context, normaliseEmail(email));
    return loginIdentifier && this.get(context, loginIdentifier.userId);
  }

  @Transactional()
  async create(context: Context, user: IUserCreateRequest) {
    const normalisedEmail = normaliseEmail(user.email);

    await this.validateEmailAddressAvailable(context, normalisedEmail);
    const createdUser = await this.createUser(context, {
      ...user,
      email: normalisedEmail,
      roles: user.roles || [],
    });
    await this.createLoginIdentifier(context, normalisedEmail, createdUser.id);

    return createdUser;
  }

  @Transactional()
  async update(context: Context, id: string, updates: U) {
    const user = await this.get(context, id);
    if (!user) {
      throw new Error(`No user exists with id: ${id}`);
    }

    if (updates.roles && updates.roles.includes('super')) {
      throw new Error('Cannot assign super role to users');
    }

    const normalisedEmail = updates.email && normaliseEmail(updates.email);
    if (normalisedEmail && normalisedEmail !== user.email) {
      this.baseLogger.info(`Email changed from [${user.email}] to [${normalisedEmail}]. Changing email for user id [${user.id}]`);
      await this.validateEmailAddressAvailable(context, normalisedEmail);
      await Promise.all([
        this.loginIdentifierRepository.delete(context, user.email),
        this.createLoginIdentifier(context, normalisedEmail, user.id),
      ]);
    }
    const userUpdates = (normalisedEmail && ({ ...(updates as object), email: normalisedEmail } as U)) || updates;
    return this.updateUser(context, user, userUpdates);
  }

  private async createLoginIdentifier(context: Context, email: string, userId: string) {
    return this.loginIdentifierRepository.save(context, {
      id: email,
      createdAt: new Date(),
      userId,
    });
  }

  private async validateEmailAddressAvailable(context: Context, email: string) {
    const existing = await this.loginIdentifierRepository.get(context, email);
    if (existing) {
      throw new Error(`Email address already exists: ${email}`);
    }
  }
}
