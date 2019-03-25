import { Profile } from 'passport-auth0';
import { DatastoreProvider } from '../datastore/datastore.provider';
import { Configuration, IUser } from '../index';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
export declare class AuthConfigurer {
    private readonly configuration;
    private readonly userService;
    private readonly authService;
    private readonly datastore;
    private readonly logger;
    constructor(datastoreProvider: DatastoreProvider, configuration: Configuration, userService: UserService<IUser>, authService: AuthService);
    private init;
    beginAuthenticateGoogle(): any;
    completeAuthenticateGoogle(): any;
    beginAuthenticateSaml(): any;
    completeAuthenticateSaml(): any;
    beginAuthenticateAuth0(): any;
    completeAuthenticateAuth0(): any;
    authenticateLocal(): any;
    validate: (username: string, password: string, done: (error: Error | null, user: false | IUser) => void) => Promise<void>;
    validateGmail: (accessToken: string, refreshToken: string, profile: object, done: (error: Error | null, user: false | IUser) => void) => Promise<void>;
    validateSaml: (profile: any, done: any) => Promise<any>;
    validateAuth0: (accessToken: string, refreshToken: string, extraParams: any, profile: Profile, done: (error: Error | null, user: false | IUser) => void) => Promise<void>;
}
