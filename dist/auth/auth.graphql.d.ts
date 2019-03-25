import { CredentialRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { InviteUserService } from './invite-user.service';
import { PasswordResetService } from './password-reset.service';
import { Context, IUser } from '..';
export declare class AuthResolver {
    private readonly credentialsRepository;
    private readonly authService;
    private readonly passwordResetService;
    private readonly inviteUserService;
    constructor(credentialsRepository: CredentialRepository, authService: AuthService, passwordResetService: PasswordResetService, inviteUserService: InviteUserService);
    credentials({ id }: IUser, _args: {}, context: Context): Promise<{
        username: string;
        type: "password" | "google" | "saml" | "auth0";
    } | undefined>;
    me(_req: void, _args: void, context: Context<IUser>): Promise<IUser | undefined>;
    resetPassword(_req: void, { email }: {
        email: string;
    }, context: Context): Promise<void>;
    confirmResetPassword(_req: void, { code, newPassword }: {
        code: string;
        newPassword: string;
    }, context: Context): Promise<void>;
    inviteUser(_req: void, { email, roles }: {
        email: string;
        roles: string[];
    }, context: Context): Promise<string>;
    activateAccount(_req: void, { code, name, password }: {
        code: string;
        name: string;
        password: string;
    }, context: Context): Promise<void>;
}
