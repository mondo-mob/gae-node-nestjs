import { MailSender } from '../mail.sender';
import { GmailConfigurer } from './gmail.configurer';
import { Options } from 'nodemailer/lib/mailer';
import { Configuration } from '../../configuration';
import { Context } from '../../datastore/context';
export declare class GmailSender implements MailSender {
    private readonly gmailConfigurer;
    private readonly configurationProvider;
    private logger;
    constructor(gmailConfigurer: GmailConfigurer, configurationProvider: Configuration);
    send(context: Context, mailOptions: Options): Promise<void>;
}
