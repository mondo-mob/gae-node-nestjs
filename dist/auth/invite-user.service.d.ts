import { Context, IUser } from '../datastore/context';
import { Configuration, MailSender, UserService } from '../index';
import { CredentialRepository, UserInviteRepository } from './auth.repository';
export declare const INVITE_CODE_EXPIRY: number;
export interface IInviteUserResponse {
    user: IUser;
    inviteId?: string;
    activateLink?: string;
}
export interface IInviteUserRequest {
    email: string;
    roles: string[];
    name?: string;
    skipEmail?: boolean;
}
export declare class InviteUserService {
    private readonly authRepository;
    private readonly mailSender;
    private readonly configuration;
    private readonly userService;
    private readonly userInviteRepository;
    private readonly logger;
    constructor(authRepository: CredentialRepository, mailSender: MailSender, configuration: Configuration, userService: UserService<IUser>, userInviteRepository: UserInviteRepository);
    inviteUserIfRequired(context: Context, request: IInviteUserRequest): Promise<IInviteUserResponse>;
    inviteUser(context: Context, request: IInviteUserRequest): Promise<IInviteUserResponse>;
    getInvitedUser(context: Context, code: string): Promise<IUser | undefined>;
    protected inviteUserInternal(context: Context, request: IInviteUserRequest, validateNew: boolean): Promise<IInviteUserResponse>;
    activateAccount(context: Context, code: string, name: string, password: string): Promise<IUser>;
}
