import { Options } from 'nodemailer/lib/mailer';
import { capture, instance, mock } from 'ts-mockito';
import { Configuration } from '../configuration';
import { MailSender } from './mail.sender';
import { MailWhitelistSender } from './mail-whitelist.sender';
import { mockContext, MockMailSender, testConfiguration } from '../_test/mocks';

describe('MailWhitelistSender', () => {
  let sender: MailWhitelistSender;
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
      new MailWhitelistSender(aMailSender, config);
    }).toThrowError('No whitelisted email address(es) defined');
  };

  const setupWhitelistEmails = (count: number) => {
    const whitelist = [];
    for (let i = 1; i <= count; i++) {
      whitelist.push(`whitelist${i}@example.com`);
    }
    config.devHooks = {
      emailWhitelist: whitelist,
    };
  };

  it('will fail to initialise when config.devHooks is undefined', () => {
    verifyConstructionFails();
  });

  it('will fail to initialise when config.devHooks.emailWhitelist is undefined', () => {
    config.devHooks = {};
    verifyConstructionFails();
  });

  it('will fail to initialise when config.devHooks.emailWhitelist is empty', () => {
    setupWhitelistEmails(0);
    verifyConstructionFails();
  });

  it('will filter emails when sent as comma separated list', async () => {
    mailOptions = {
      to: 'invalid1@example.com, invalid2@example.com, whitelist1@example.com,whitelist2@example.com',
      cc: 'invalid3@example.com, invalid4@example.com,whitelist3@example.com, whitelist4@example.com',
      bcc: 'invalid5@example.com, invalid6@example.com, whitelist5@example.com, whitelist6@example.com',
      subject: 'original subject',
    };
    setupWhitelistEmails(6);

    sender = new MailWhitelistSender(aMailSender, config);
    await sender.send(context, mailOptions);

    const [, actualMailOptions] = capture(mockedMailSender.send).first();
    expect(actualMailOptions.to).toEqual('whitelist1@example.com,whitelist2@example.com');
    expect(actualMailOptions.cc).toEqual('whitelist3@example.com,whitelist4@example.com');
    expect(actualMailOptions.bcc).toEqual('whitelist5@example.com,whitelist6@example.com');
    expect(actualMailOptions.subject).toEqual(mailOptions.subject);
  });

  it('will filter emails when sent as array of strings', async () => {
    mailOptions = {
      to: ['invalid1@example.com', 'invalid2@example.com', 'whitelist1@example.com', 'whitelist2@example.com'],
      cc: ['invalid3@example.com', 'invalid4@example.com', 'whitelist3@example.com', 'whitelist4@example.com'],
      bcc: ['invalid5@example.com', 'invalid6@example.com', 'whitelist5@example.com', 'whitelist6@example.com'],
      subject: 'original subject',
    };
    setupWhitelistEmails(6);

    sender = new MailWhitelistSender(aMailSender, config);
    await sender.send(context, mailOptions);

    const [, actualMailOptions] = capture(mockedMailSender.send).first();
    expect(actualMailOptions.to).toEqual(['whitelist1@example.com', 'whitelist2@example.com']);
    expect(actualMailOptions.cc).toEqual(['whitelist3@example.com', 'whitelist4@example.com']);
    expect(actualMailOptions.bcc).toEqual(['whitelist5@example.com', 'whitelist6@example.com']);
    expect(actualMailOptions.subject).toEqual(mailOptions.subject);
  });

  it('will filter emails when sent as mixed array', async () => {
    mailOptions = {
      to: [
        'blocked1@example.com',
        { name: 'Mr Blocked 2', address: 'blocked2@example.com' },
        'whitelist1@example.com',
        { name: 'Walter White', address: 'whitelist2@example.com' },
      ],
      cc: [
        'blocked3@example.com',
        { name: 'Mr Blocked 4', address: 'blocked4@example.com' },
        'whitelist3@example.com',
        { name: 'Walter White Jr', address: 'whitelist4@example.com' },
      ],
      bcc: [
        'blocked5@example.com',
        { name: 'Mr Blocked 6', address: 'blocked6@example.com' },
        'whitelist5@example.com',
        { name: 'Skyler White', address: 'whitelist6@example.com' },
      ],
      subject: 'original subject',
    };
    setupWhitelistEmails(6);

    sender = new MailWhitelistSender(aMailSender, config);
    await sender.send(context, mailOptions);

    const [, actualMailOptions] = capture(mockedMailSender.send).first();
    expect(actualMailOptions.to).toEqual([
      'whitelist1@example.com',
      { name: 'Walter White', address: 'whitelist2@example.com' },
    ]);
    expect(actualMailOptions.cc).toEqual([
      'whitelist3@example.com',
      { name: 'Walter White Jr', address: 'whitelist4@example.com' },
    ]);
    expect(actualMailOptions.bcc).toEqual([
      'whitelist5@example.com',
      { name: 'Skyler White', address: 'whitelist6@example.com' },
    ]);
    expect(actualMailOptions.subject).toEqual(mailOptions.subject);
  });
});
