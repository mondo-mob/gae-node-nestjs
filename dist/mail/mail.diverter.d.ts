import { Options } from 'nodemailer/lib/mailer';
import { Configuration } from '../configuration';
import { Context } from '../datastore/context';
import { MailSender } from './mail.sender';
export declare class MailDiverter implements MailSender {
    private readonly mailSender;
    private readonly configurationProvider;
    private readonly logger;
    private readonly subjectPrefix;
    constructor(mailSender: MailSender, configurationProvider: Configuration);
    send(context: Context, mailOptions: Options): Promise<void>;
    private divertAddresses;
    private getDivertedFromAddressesAsString;
}
