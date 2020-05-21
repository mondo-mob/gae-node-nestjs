import { Options } from 'nodemailer/lib/mailer';
import { Context } from '../datastore/context';

export interface MailSender {
  send(context: Context, mailOptions: Options): Promise<void>;
}

export const MAIL_SENDER = 'MailSender';
