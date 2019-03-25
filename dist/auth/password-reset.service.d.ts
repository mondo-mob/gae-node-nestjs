import { Context } from '../datastore/context';
import { Configuration, MailSender } from '../index';
import { CredentialRepository, PasswordResetRepository } from './auth.repository';
export declare class PasswordResetService {
    private readonly authRepository;
    private readonly passwordResetRepository;
    private readonly configuration;
    private readonly mailSender;
    private readonly logger;
    private readonly tokenExpiry;
    constructor(authRepository: CredentialRepository, passwordResetRepository: PasswordResetRepository, configuration: Configuration, mailSender: MailSender);
    resetPassword(context: Context, email: string): Promise<void>;
    confirmResetPassword(context: Context, code: string, newPassword: string): Promise<void>;
}
