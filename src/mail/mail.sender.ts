import {Options} from 'nodemailer/lib/mailer';
import {Context, IUser} from '..';

export interface MailSender {
  send(context: Context<IUser>, mailOptions: Options): Promise<void>;
}