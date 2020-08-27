import * as _ from 'lodash';
import { Inject, Injectable } from '@nestjs/common';
import { createTransport, SentMessageInfo } from 'nodemailer';
import { Options } from 'nodemailer/lib/mailer';
import { Context } from '../..';
import { Configuration, CONFIGURATION } from '../../configuration';
import { createLogger } from '../../logging';
import { MailSender } from '../mail.sender';

const ENDS_WITH_EMAIL = /(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/;

@Injectable()
export class SmtpSender implements MailSender {
  private readonly logger = createLogger('smtp-sender');

  constructor(
    @Inject(CONFIGURATION) private readonly configurationProvider: Configuration,
  ) {
    this.logger.info('Created SmtpSender');
  }

  async send(context: Context, mailOptions: Options) {
    if (!this.configurationProvider.auth.smtp || !this.configurationProvider.auth.smtp.enabled) {
      this.logger.error('Smtp credentials are not configured yet. No environment configuration exists for "auth.smtp"');
    } else {
      const mailConfig = {
        auth: {
          user: this.configurationProvider.auth.smtp.user,
          pass: this.configurationProvider.auth.smtp.password,
        },
        host: this.configurationProvider.auth.smtp.host,
        port: this.configurationProvider.auth.smtp.port,
        secure: this.configurationProvider.auth.smtp.secure,
        from: this.configurationProvider.auth.smtp.from,
      };

      const transport: any = {
        pool: true,
        ...mailConfig
      };

      const transporter = createTransport(transport);

      this.logger.info(
        {
          logDetails: {
            to: mailOptions.to,
            cc: mailOptions.cc,
            bcc: mailOptions.bcc,
          },
        },
        'Sending email via smtp (see logDetails property for to, cc, bcc) with subject: %s',
        mailOptions.subject,
      );

      // if user provides a string 'from' value that doesn't end with an email address, we add it in from config
      let from = mailOptions.from;
      if (!from) {
        from = mailConfig.from;
      } else if (_.isString(from) && !from.match(ENDS_WITH_EMAIL)) {
        from = { name: from, address: mailConfig.from.address };
      }

      await new Promise((resolve, reject) =>
        transporter.sendMail(
          {
            ...mailOptions,
            from,
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