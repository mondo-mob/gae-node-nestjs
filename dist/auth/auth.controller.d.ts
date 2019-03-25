import { AuthConfigurer } from './auth.configurer';
import { Request, Response } from 'express';
import { InviteUserService, Context, Configuration } from '..';
export declare class AuthController {
    private readonly authConfigurer;
    private readonly inviteUserService;
    private readonly configuration;
    private logger;
    constructor(authConfigurer: AuthConfigurer, inviteUserService: InviteUserService, configuration: Configuration);
    signIn(req: Request, res: Response, next: (err: Error) => void): void;
    activate(req: Request, res: Response, next: (err: Error) => void, context: Context): Promise<void>;
    signOut(req: Request, res: Response, next: (err: Error) => void): void;
    signInGoogle(req: Request, res: Response, next: () => void): void;
    completeSignInGoogle(req: Request, res: Response): void;
    signInSaml(req: Request, res: Response, next: () => void): void;
    completeSignInSaml(req: Request, res: Response): void;
    signInAuth0(req: Request, res: Response, next: () => void): void;
    completeSignInAuth0(req: Request, res: Response): void;
}
