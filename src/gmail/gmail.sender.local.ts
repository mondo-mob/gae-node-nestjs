import { Injectable } from '@nestjs/common';
import * as Logger from 'bunyan';
import { Options } from 'nodemailer/lib/mailer';
import { Context, createLogger } from '..';

@Injectable()
export class LocalGmailSender {
  private readonly logger: Logger;

  constructor() {
    this.logger = createLogger('gmail-sender');
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
