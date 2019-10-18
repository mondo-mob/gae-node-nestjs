import { Inject, Injectable } from '@nestjs/common';
import * as Logger from 'bunyan';
import { isEmpty } from 'lodash';
import { Options } from 'nodemailer/lib/mailer';
import { CONFIGURATION, Configuration } from '../configuration';
import { Context } from '../datastore/context';
import { createLogger } from '../gcloud/logging';
import { MailSender } from './mail.sender';

@Injectable()
export class MailSubjectSender implements MailSender {
  private readonly logger: Logger = createLogger('mail-subject-sender');
  private readonly subjectPrefix: string;

  constructor(
    private readonly mailSender: MailSender,
    @Inject(CONFIGURATION) private readonly configurationProvider: Configuration,
  ) {
    const { devHooks } = this.configurationProvider;
    if (!devHooks || isEmpty(devHooks.emailSubjectPrefix)) {
      throw new Error('No subject prefix defined');
    }
    this.subjectPrefix = `${devHooks.emailSubjectPrefix}: `;
    this.logger.info(`Configuring mail with subject prefix '${this.subjectPrefix}'`);
  }

  async send(context: Context, mailOptions: Options) {
    const subject = `${this.subjectPrefix}${mailOptions.subject}`;
    this.logger.info(`Sending email with prefixed subject: '${subject}'`);
    return this.mailSender.send(context, { ...mailOptions, subject });
  }
}
