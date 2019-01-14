import {Inject, Injectable} from '@nestjs/common';
import * as Logger from 'bunyan';
import {isEmpty, replace} from 'lodash';
import {Address, Options} from 'nodemailer/lib/mailer';
import {Configuration} from '../configuration';
import {Context} from '../datastore/context';
import {createLogger} from '../gcloud/logging';
import {MailSender} from './mail.sender';

@Injectable()
export class MailDiverter implements MailSender {
  private logger: Logger;

  constructor(
    private readonly mailSender: MailSender,
    @Inject('Configuration') private readonly configurationProvider: Configuration,
  ) {
    this.logger = createLogger('mail-diverter');
    if (!this.configurationProvider.devHooks || isEmpty(this.configurationProvider.devHooks.divertEmailTo)) {
      throw new Error('No divert-to email address(es) defined');
    }
  }

  async send(context: Context, mailOptions: Options) {
    return this.mailSender.send(context, {
      ...mailOptions,
      to: this.divertAddresses(mailOptions.to),
      cc: this.divertAddresses(mailOptions.cc),
      bcc: this.divertAddresses(mailOptions.bcc),
    });
  }

  private divertAddresses = (actualAddresses: string | Address | Array<string | Address> | undefined) => {
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

  private getDivertedFromAddressesAsString = (actualAddress: string | Address | Array<string | Address>) => {
    // convert all input into an array for ease of processing
    let addressList = [actualAddress];
    if (actualAddress instanceof Array) {
      addressList = actualAddress;
    }
    // Extract raw email address and concatenate into a comma separated string
    const justAddresses = addressList.map(address => {
      if (typeof address === 'string') {
        return address.trim();
      }
      // Assuming it's an Address object
      return (address as Address).address.trim();
    }).join(', ');

    const deAttedAddresses = replace(justAddresses, /@/g, '.at.');
    return `Diverted from ${deAttedAddresses}`;
  }

}
