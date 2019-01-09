import {Context, IUser, IUserInput, Transactional} from '..';
import {LoginIdentifierRepository} from './login-identifier.repository';

export const USER_SERVICE = 'UserService';

export interface UserService<T extends IUser> {
  getByEmail(context: Context, email: string): Promise<T | undefined>;
  get(context: Context, userId: string): Promise<T | undefined>;
  create(context: Context, user: IUserInput): Promise<T>;
  update(context: Context, id: string, updates: IUserInput): Promise<T>;

}

export abstract class AbstractUserService<T extends IUser> implements UserService<T> {

  protected constructor(protected readonly loginIdentifierRepository: LoginIdentifierRepository){
  };

  abstract get(context: Context, userId: string): Promise<T | undefined>;
  protected abstract createUser(context: Context, user: IUserInput): Promise<T>;
  protected abstract updateUser(context: Context, user: T, updates: IUserInput): Promise<T>;

  async getByEmail(context: Context, email: string) {
    const loginIdentifier = await this.loginIdentifierRepository.get(context, email.toLowerCase());
    return loginIdentifier && this.get(context, loginIdentifier.userId);
  }

  @Transactional()
  async create(context: Context, user: IUserInput) {
    const normalisedEmail = user.email.toLowerCase();

    await this.validateEmailAddressAvailable(context, normalisedEmail);
    const createdUser = await this.createUser(context, {...user, email: normalisedEmail});
    await this.createLoginIdentifier(context, createdUser.id, normalisedEmail);

    return createdUser;
  }

  @Transactional()
  async update(context: Context, id: string, updates: IUserInput) {
    const user = await this.get(context, id);
    if (!user) {
      throw new Error(`No user exists with id: ${id}`);
    }
    const normalisedEmail = updates.email.toLowerCase();
    if (normalisedEmail !== user.email) {
      await this.validateEmailAddressAvailable(context, normalisedEmail);
      await Promise.all([
          this.loginIdentifierRepository.delete(context, user.email),
          this.createLoginIdentifier(context, user.id, normalisedEmail),
      ]);
    }

    return this.updateUser(context, user, {...updates, email: normalisedEmail});
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
