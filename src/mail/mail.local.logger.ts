import { Injectable } from '@nestjs/common';
import * as Logger from 'bunyan';
import { Options } from 'nodemailer/lib/mailer';
import { Context } from '../datastore/context';
import { createLogger } from '../gcloud/logging';
import { MailSender } from './mail.sender';

@Injectable()
export class LocalMailLogger implements MailSender {
  private readonly logger: Logger = createLogger('local-mail-logger');

  constructor() {
    this.logger.info('MailSender instance is LocalMailLogger');
  }

  async send(context: Context, mailOptions: Options) {
    if (!mailOptions.to && !mailOptions.cc && !mailOptions.bcc) {
      throw new Error('No recipients defined');
    }

    this.logger.info(
      JSON.stringify({
        ...mailOptions,
        attachments: undefined,
      }),
    );
  }
}