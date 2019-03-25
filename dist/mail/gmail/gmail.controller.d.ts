import { Request, Response } from 'express';
import { GmailConfigurer } from './gmail.configurer';
export declare class GmailController {
    private readonly gmailConfigurer;
    private readonly logger;
    constructor(gmailConfigurer: GmailConfigurer);
    setupGmailOAuth(request: Request, response: Response): void;
    oauthCallback(request: Request, response: Response): void;
}
