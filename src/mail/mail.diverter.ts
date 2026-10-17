import { Inject, Injectable } from '@nestjs/common';
import { flattenDeep, isEmpty, replace } from 'lodash';
import { Options } from 'nodemailer/lib/mailer';
import { MimeNodeAddress } from 'nodemailer/lib/mime-node';
import { CONFIGURATION, Configuration } from '../configuration';
import { Context } from '../datastore/context';
import { createLogger, Logger } from '../logging';
import { MailSender } from './mail.sender';

@Injectable()
export class MailDiverter implements MailSender {
  private readonly logger: Logger = createLogger('mail-diverter');

  constructor(
    private readonly mailSender: MailSender,
    @Inject(CONFIGURATION) private readonly configurationProvider: Configuration,
  ) {
    const { devHooks } = this.configurationProvider;
    if (!devHooks || isEmpty(devHooks.divertEmailTo)) {
      throw new Error('No divert-to email address(es) defined');
    }
    this.logger.info('MailSender instance is MailDiverter');
    this.logger.info(`Configuring mail diversion to: ${devHooks.divertEmailTo}`);
  }

  async send(context: Context, mailOptions: Options) {
    const diversionOverrides = {
      to: this.divertAddresses(mailOptions.to),
      cc: this.divertAddresses(mailOptions.cc),
      bcc: this.divertAddresses(mailOptions.bcc),
    };
    this.logger.info('Diverting mail with overrides: ', diversionOverrides);
    return this.mailSender.send(context, { ...mailOptions, ...diversionOverrides });
  }

  private divertAddresses = (actualAddresses: Options['to']) => {
    if (!isEmpty(actualAddresses)) {
      // @ts-ignore
      const divertedFromAddresses = this.getDivertedFromAddressesAsString(actualAddresses);
      // @ts-ignore
      return this.configurationProvider.devHooks.divertEmailTo.map(divertToAddress => {
        return {
          name: divertedFromAddresses,
          address: divertToAddress,
        };
      });
    }
    return [];
  };

  private getDivertedFromAddressesAsString = (actualAddress: NonNullable<Options['to']>) => {
    // convert all input into a flat array for ease of processing
    const addressList = flattenDeep([actualAddress]) as Array<string | MimeNodeAddress>;
    // Extract raw email address and concatenate into a comma separated string
    const justAddresses = addressList
      .map(address => {
        if (typeof address === 'string') {
          return address.trim();
        }
        // Assuming it's an Address object (group addresses have no address of their own)
        return (address.address || '').trim();
      })
      .join(', ');

    const deAttedAddresses = replace(justAddresses, /@/g, '.at.');
    return `Diverted from ${deAttedAddresses}`;
  };
}
