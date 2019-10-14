import { Injectable } from '@nestjs/common';
import * as Logger from 'bunyan';
import { Options } from 'nodemailer/lib/mailer';
import { Context } from '../datastore/context';
import { createLogger } from '../gcloud/logging';
import { MailSender } from './mail.sender';
import * as htmlToText from 'html-to-text';

@Injectable()
export class LoggingMailSenderStub implements MailSender {
  private readonly logger: Logger = createLogger('local-mail-logger');

  constructor() {
    this.logger.info('MailSender instance is LocalMailLogger');
  }

  async send(context: Context, mailOptions: Options) {
    if (!mailOptions.to && !mailOptions.cc && !mailOptions.bcc) {
      throw new Error('No recipients defined');
    }

    const content =
      mailOptions.text ||
      (typeof mailOptions.html === 'string' && htmlToText.fromString(mailOptions.html)) ||
      '-body not loggable-';

    this.logger.info(
      'Logging email send\n\n' +
        'to:          %s\n' +
        'cc:          %s\n' +
        'bcc:         %s\n' +
        'attachments: %s\n' +
        'subject:     %s\n' +
        '\n' +
        '%s\n' +
        '\n\n',
      this.stringify(mailOptions.to),
      this.stringify(mailOptions.cc),
      this.stringify(mailOptions.bcc),
      (mailOptions.attachments && mailOptions.attachments.length) || 0,
      this.stringify(mailOptions.subject),
      content,
    );
  }

  private stringify(source?: any) {
    if (!source) {
      return '';
    }
    return typeof source === 'string' ? source : JSON.stringify(source);
  }
}
