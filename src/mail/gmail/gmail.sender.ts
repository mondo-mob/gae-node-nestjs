import { Inject, Injectable } from '@nestjs/common';
import { MailSender } from '../mail.sender';
import { GmailConfigurer } from './gmail.configurer';
import { createTransport, SentMessageInfo } from 'nodemailer';
import { Options } from 'nodemailer/lib/mailer';
import * as Logger from 'bunyan';
import { Configuration } from '../../configuration';
import { Context } from '../../datastore/context';
import { createLogger } from '../../gcloud/logging';

@Injectable()
export class GmailSender implements MailSender{
  private logger: Logger;

  constructor(
    private readonly gmailConfigurer: GmailConfigurer,
    @Inject('Configuration') private readonly configurationProvider: Configuration,
  ) {
    this.logger = createLogger('gmail-sender');
  }

  async send(context: Context, mailOptions: Options) {
    const credential = await this.gmailConfigurer.getCredential(context);

    if (!credential) {
      this.logger.error('Gmail OAuth is not configured yet. No StoredCredential entity with id "gmail-credential"');

    } else if (!this.configurationProvider.auth.google) {
      this.logger.error('Gmail OAuth is not configured yet. No environment configuration exists for "auth.google"');

    } else {
      const auth = {
        type: 'oauth2',
        user: this.configurationProvider.gmailUser,
        clientId: this.configurationProvider.auth.google.clientId,
        clientSecret: this.configurationProvider.auth.google.secret,
        refreshToken: credential.value,
      };

      const transport: any = {
        service: 'gmail',
        auth,
      };
      const transporter = createTransport(transport);

      await new Promise((resolve, reject) =>
        transporter.sendMail(
          {
            from: auth.user,
            ...mailOptions,
          },
          (err: Error | null, res: SentMessageInfo) => {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          },
        ),
      );
    }
  }
}
