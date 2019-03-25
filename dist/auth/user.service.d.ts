import { Context, IUser, IUserCreateRequest, IUserUpdates } from '..';
import { LoginIdentifierRepository } from './login-identifier.repository';
export declare const USER_SERVICE = "UserService";
export interface UserService<T extends IUser, U extends IUserUpdates = IUserUpdates, C extends IUserCreateRequest = IUserCreateRequest> {
    getByEmail(context: Context, email: string): Promise<T | undefined>;
    get(context: Context, userId: string): Promise<T | undefined>;
    create(context: Context, user: C): Promise<T>;
    update(context: Context, id: string, updates: U): Promise<T>;
}
export declare abstract class AbstractUserService<T extends IUser, U extends IUserUpdates = IUserUpdates, C extends IUserCreateRequest = IUserCreateRequest> implements UserService<T, U, C> {
    protected readonly loginIdentifierRepository: LoginIdentifierRepository;
    protected constructor(loginIdentifierRepository: LoginIdentifierRepository);
    abstract get(context: Context, userId: string): Promise<T | undefined>;
    protected abstract createUser(context: Context, user: IUserCreateRequest): Promise<T>;
    protected abstract updateUser(context: Context, user: T, updates: U): Promise<T>;
    getByEmail(context: Context, email: string): Promise<T | undefined>;
    create(context: Context, user: IUserCreateRequest): Promise<T>;
    update(context: Context, id: string, updates: U): Promise<T>;
    private createLoginIdentifier;
    private validateEmailAddressAvailable;
}
