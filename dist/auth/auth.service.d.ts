import { HttpException } from '@nestjs/common';
import { CredentialRepository, LoginCredentials } from './auth.repository';
import { UserService } from './user.service';
import { Configuration, IUser } from '../index';
import { Context } from '../datastore/context';
export declare class UserNotFoundError extends HttpException {
    constructor();
}
export declare class CredentialsNotFoundError extends HttpException {
    constructor();
}
export declare class PasswordInvalidError extends HttpException {
    constructor();
}
export declare function hashPassword(password: string): Promise<string>;
export declare class AuthService {
    private readonly authRepository;
    private readonly userService;
    private readonly configurationProvider;
    private readonly logger;
    constructor(authRepository: CredentialRepository, userService: UserService<IUser>, configurationProvider: Configuration);
    validateUser(context: Context, username: string, password: string): Promise<IUser>;
    validateUserGoogle(context: Context, inputProfile: object): Promise<IUser>;
    validateUserSaml(context: Context, profile: any): Promise<IUser>;
    validateUserAuth0(context: Context, email: string, orgId: string, roles: string[]): Promise<IUser>;
    createAccount(context: Context, email: string, password: string, account: string): Promise<LoginCredentials>;
}
