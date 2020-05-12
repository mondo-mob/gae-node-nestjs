import { Options } from 'nodemailer/lib/mailer';
import { capture, instance, mock } from 'ts-mockito';
import { Configuration } from '../configuration';
import { MailSender } from './mail.sender';
import { MailSubjectSender } from './mail-subject.sender';
import { mockContext, MockMailSender, testConfiguration } from '../_test/mocks';

describe('MailWhitelistSender', () => {
  let sender: MailSubjectSender;
  let mailOptions: Options;
  let config: Configuration;
  let aMailSender: MailSender;
  let mockedMailSender: MailSender;
  const context = mockContext();

  beforeEach(() => {
    config = testConfiguration();
    mockedMailSender = mock(MockMailSender);
    aMailSender = instance(mockedMailSender);
  });

  const verifyConstructionFails = () => {
    expect(() => {
      new MailSubjectSender(aMailSender, config);
    }).toThrowError('No subject prefix defined');
  };

  it('will fail to initialise when config.devHooks is undefined', () => {
    verifyConstructionFails();
  });

  it('will fail to initialise when config.devHooks.emailSubjectPrefix is undefined', () => {
    config.devHooks = {};
    verifyConstructionFails();
  });

  it('will fail to initialise when config.devHooks.emailSubjectPrefix is empty', () => {
    config.devHooks = {
      emailSubjectPrefix: '',
    };
    verifyConstructionFails();
  });

  it('will prefix subject when emailSubjectPrefix configured', async () => {
    mailOptions = {
      to: ['email1@example.com', { name: 'Walter White', address: 'email2@example.com' }],
      cc: 'email3@example.com',
      bcc: undefined,
      subject: 'original subject',
    };
    config.devHooks = {
      emailSubjectPrefix: 'TEST EMAIL',
    };

    sender = new MailSubjectSender(aMailSender, config);
    await sender.send(context, mailOptions);

    const [, actualMailOptions] = capture(mockedMailSender.send).first();
    expect(actualMailOptions.to).toEqual([
      'email1@example.com',
      { name: 'Walter White', address: 'email2@example.com' },
    ]);
    expect(actualMailOptions.cc).toEqual('email3@example.com');
    expect(actualMailOptions.bcc).toBeUndefined();
    expect(actualMailOptions.subject).toEqual(`TEST EMAIL: ${mailOptions.subject}`);
  });
});
