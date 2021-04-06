import { Task } from './auth.guard';
import { Body, Controller, Inject, Post } from '@nestjs/common';
import { MAIL_SENDER, MailSender } from '../mail/mail.sender';
import { Context, Ctxt } from '../datastore/context';
import { Configuration, CONFIGURATION } from '../configuration';
import { userInviteEmail } from '../mail-templates/invite';
import { createLogger, Logger } from '../logging';

const DEFAULT_INVITE_CODE_EXPIRY_EMAIL_COPY = '7 days';
const DEFAULT_INVITATION_EMAIL_COPY = 'You have been invited as a new user.';

@Task()
@Controller('/tasks/auth')
export class AuthTaskController {
  private readonly logger: Logger;

  constructor(
    @Inject(CONFIGURATION) private readonly configuration: Configuration,
    @Inject(MAIL_SENDER) private readonly mailSender: MailSender,
  ) {
    this.logger = createLogger('auth-task-controller');
  }

  @Post('/activation-email')
  async sendActivationEmail(
    @Ctxt() context: Context,
    @Body('inviteId') inviteId: string,
    @Body('email') email: string,
  ) {
    const activateLink = `${this.configuration.host}/activate/${inviteId}`;
    this.logger.info(`Sending invitation email to ${email} with link ${activateLink}`);
    const title = 'Activate your account';
    await this.mailSender.send(context, {
      to: email,
      subject: title,
      html: userInviteEmail(title, activateLink, this.getInvitationCopy(), this.getActivationExpiryEmailCopy()),
    });
  }

  @Post('/password-reset-email')
  async sendPasswordResetEmail(
    @Ctxt() context: Context,
    @Body('resetId') resetId: string,
    @Body('email') email: string,
  ) {
    const address = `${this.configuration.host}/confirm-reset/${resetId}`;
    await this.mailSender.send(context, {
      to: email,
      subject: 'Password reset',
      html: `
        <html>
        <head></head>
        <body><a href="${address}">Reset your password</a></body>
        </html>
      `,
    });
  }

  private getActivationExpiryEmailCopy = (): string | undefined =>
    !(this.configuration.auth.local && this.configuration.auth.local.activationExpiryInMinutes)
      ? DEFAULT_INVITE_CODE_EXPIRY_EMAIL_COPY
      : this.configuration.auth.local.activationExpiryEmailCopy;

  private getInvitationCopy = (): string =>
    !(this.configuration.auth.local && this.configuration.auth.local.invitationEmailCopy)
      ? DEFAULT_INVITATION_EMAIL_COPY
      : this.configuration.auth.local.invitationEmailCopy;
}
