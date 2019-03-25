import { Options } from 'nodemailer/lib/mailer';
import { Context } from '../datastore/context';
import { MailSender } from './mail.sender';
export declare class LoggingMailSenderStub implements MailSender {
    private readonly logger;
    constructor();
    send(context: Context, mailOptions: Options): Promise<void>;
    private stringify;
}
