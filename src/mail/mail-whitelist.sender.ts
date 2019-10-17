import * as Logger from 'bunyan';
import { castArray } from 'lodash';
import { Address, Options } from 'nodemailer/lib/mailer';
import { Configuration } from '../configuration';
import { Context } from '../datastore/context';
import { createLogger } from '../gcloud/logging';
import { MailSender } from './mail.sender';
import { isEmpty } from '../util/guards';
import { MailLoggingSender } from './mail-logging.sender';

export class MailWhitelistSender implements MailSender {
  private readonly logger: Logger = createLogger('mail-whitelist-sender');
  private readonly emailWhitelist: string[];

  constructor(private readonly mailSender: MailSender, private readonly configurationProvider: Configuration) {
    const { devHooks } = this.configurationProvider;
    if (!devHooks || isEmpty(devHooks.emailWhitelist)) {
      throw new Error('No whitelisted email address(es) defined');
    }
    this.logger.info('MailSender instance is MailWhitelistSender');
    this.logger.info(`Configuring mail whitelist: ${devHooks.emailWhitelist}`);
    this.emailWhitelist = devHooks.emailWhitelist;
  }

  async send(context: Context, mailOptions: Options) {
    const filteredAddresses = {
      to: this.filterAddresses(mailOptions.to),
      cc: this.filterAddresses(mailOptions.cc),
      bcc: this.filterAddresses(mailOptions.bcc),
    };

    if (isEmpty(filteredAddresses.to) && isEmpty(filteredAddresses.cc) && isEmpty(filteredAddresses.bcc)) {
      this.logger.warn('Cannot send email - no whitelisted recipients found');
      return new MailLoggingSender().send(context, mailOptions);
    } else {
      this.logger.info('Sending email using whitelisted addresses: ', filteredAddresses);
      return this.mailSender.send(context, { ...mailOptions, ...filteredAddresses });
    }
  }

  private filterAddresses = (actualAddresses: string | Address | Array<string | Address> | undefined) => {
    if (isEmpty(actualAddresses)) {
      return [];
    }

    if (typeof actualAddresses === 'string') {
      const addresses = actualAddresses.split(',');
      return addresses
        .map(address => address.trim())
        .filter(address => this.filterAddress(address))
        .join(',');
    }

    return castArray(actualAddresses).filter(address => this.filterAddress(address));
  };

  private filterAddress = (address: string | Address): boolean => {
    const email = typeof address === 'string' ? address.trim() : address.address.trim();

    if (this.emailWhitelist.includes(email)) {
      return true;
    }

    this.logger.info(`Filtering non-whitelist email: ${email}`);
    return false;
  };
}
