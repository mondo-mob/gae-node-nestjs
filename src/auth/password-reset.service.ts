import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Context } from '../datastore/context';
import { Transactional } from '../datastore/transactional';
import { createLogger, Logger } from '../logging';
import { CredentialRepository, PasswordResetRepository } from './auth.repository';
import { hashPassword } from './auth.service';
import { Configuration } from '../configuration';
import { AuthTaskService } from './auth.task.service';

const DEFAULT_PASSWORD_TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

@Injectable()
export class PasswordResetService {
  private readonly logger: Logger;
  private readonly tokenExpiry: number;

  constructor(
    private readonly authRepository: CredentialRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    @Inject('Configuration') private readonly configuration: Configuration,
    private readonly authTaskService: AuthTaskService,
  ) {
    this.logger = createLogger('password-reset-service');
    this.tokenExpiry = configuration.passwordTokenExpiry || DEFAULT_PASSWORD_TOKEN_EXPIRY;
  }

  /**
   * Send a password reset email with a link to change password
   *
   * Does not return an error if account does not exist
   *
   * @param context
   * @param email
   */
  @Transactional()
  async resetPassword(context: Context, email: string) {
    const credentials = await this.authRepository.get(context, email);

    if (!credentials) {
      this.logger.info(`No account found when trying to reset password for "${email}"`);
      return;
    }

    if (credentials.type !== 'password') {
      this.logger.info(`No account found when trying to reset password for "${email}"`);
      return;
    }

    this.logger.info(`Queuing password reset email for "${email}"`);

    const id = uuidv4();

    await this.passwordResetRepository.save(context, {
      accountId: credentials.id,
      createdAt: new Date(),
      id,
    });

    await this.authTaskService.queuePasswordResetEmail(id, email);
  }

  /**
   * Actually reset a user's password given a valid code and a new password
   *
   * @param context
   * @param code
   * @param newPassword
   */
  @Transactional()
  async confirmResetPassword(context: Context, code: string, newPassword: string) {
    const resetToken = await this.passwordResetRepository.get(context, code);

    if (!resetToken) {
      throw new Error('Invalid password reset token');
    }

    if (Date.now() - resetToken.createdAt.getTime() > this.tokenExpiry) {
      throw new Error('Token has expired');
    }

    const account = await this.authRepository.get(context, resetToken.accountId);

    if (!account) {
      throw new Error('Account no longer exists');
    }

    if (account.type !== 'password') {
      throw new Error('Account no longer exists');
    }

    account.password = await hashPassword(newPassword);

    this.logger.info(`Resetting password for account ${resetToken.id}`);

    await this.passwordResetRepository.delete(context, resetToken.id);
    await this.authRepository.save(context, account);
  }
}
