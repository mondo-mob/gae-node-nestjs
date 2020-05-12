import { Options } from 'nodemailer/lib/mailer';
import { capture, instance, mock } from 'ts-mockito';
import { Configuration } from '../configuration';
import { MailDiverter } from './mail.diverter';
import { MailSender } from './mail.sender';
import { mockContext, MockMailSender, testConfiguration } from '../_test/mocks';

describe('MailDiverter', () => {
  let diverter: MailDiverter;
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

  it('should fail to initialise if config.devHooks is undefined', () => {
    verifyConstructionFails();
  });

  it('should fail to initialise if config.devHooks.divertEmailTo is undefined', () => {
    config.devHooks = {};
    verifyConstructionFails();
  });

  it('should fail to initialise if config.devHooks.divertEmailTo is empty', () => {
    setupDivertedEmails(0);
    verifyConstructionFails();
  });

  it('should divert single email string to alternate address', async () => {
    mailOptions = {
      to: 'actual@address.com',
      subject: 'original subject',
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(aMailSender, config);
    await diverter.send(context, mailOptions);

    const [, actualMailOptions] = capture(mockedMailSender.send).first();
    expect(actualMailOptions.to).toEqual([
      { address: 'divertTo0@test.com', name: 'Diverted from actual.at.address.com' },
    ]);
    expect(actualMailOptions.cc).toEqual([]);
    expect(actualMailOptions.bcc).toEqual([]);
    expect(actualMailOptions.subject).toEqual(mailOptions.subject);
  });

  it('should divert to, cc and bcc to alternate address', async () => {
    mailOptions = {
      to: 'actualTO@address.com',
      cc: 'actualCC@address.com',
      bcc: 'actualBCC@address.com',
      subject: 'original subject',
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(aMailSender, config);
    await diverter.send(context, mailOptions);

    const [, actualMailOptions] = capture(mockedMailSender.send).first();
    expect(actualMailOptions.to).toEqual([
      { address: 'divertTo0@test.com', name: 'Diverted from actualTO.at.address.com' },
    ]);
    expect(actualMailOptions.cc).toEqual([
      { address: 'divertTo0@test.com', name: 'Diverted from actualCC.at.address.com' },
    ]);
    expect(actualMailOptions.bcc).toEqual([
      { address: 'divertTo0@test.com', name: 'Diverted from actualBCC.at.address.com' },
    ]);
    expect(actualMailOptions.subject).toEqual(mailOptions.subject);
  });

  it('should divert multiple email string to alternate address', async () => {
    mailOptions = {
      to: 'actual@address.com, actual2@another.com',
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(aMailSender, config);
    await diverter.send(context, mailOptions);

    const [, actualMailOptions] = capture(mockedMailSender.send).first();
    expect(actualMailOptions.to).toEqual([
      { address: 'divertTo0@test.com', name: 'Diverted from actual.at.address.com, actual2.at.another.com' },
    ]);
  });

  it('should divert Address type email to alternate address', async () => {
    mailOptions = {
      to: { name: 'Not that important', address: 'actual@address.com' },
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(aMailSender, config);
    await diverter.send(context, mailOptions);

    const [, actualMailOptions] = capture(mockedMailSender.send).first();
    expect(actualMailOptions.to).toEqual([
      { address: 'divertTo0@test.com', name: 'Diverted from actual.at.address.com' },
    ]);
  });

  it('should divert an array of email strings to alternate address', async () => {
    mailOptions = {
      to: ['actual1@address.com, actual2@address.com', 'actual3@address.com'],
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(aMailSender, config);
    await diverter.send(context, mailOptions);

    const [, actualMailOptions] = capture(mockedMailSender.send).first();
    expect(actualMailOptions.to).toEqual([
      {
        address: 'divertTo0@test.com',
        name: 'Diverted from actual1.at.address.com, actual2.at.address.com, actual3.at.address.com',
      },
    ]);
  });

  it('should divert an array of Address objects to alternate address', async () => {
    mailOptions = {
      to: [
        { name: 'Not that important', address: 'actual1@address.com' },
        { name: 'Not that important', address: 'actual2@address.com' },
        { name: 'Not that important', address: 'actual3@address.com' },
      ],
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(aMailSender, config);
    await diverter.send(context, mailOptions);

    const [, actualMailOptions] = capture(mockedMailSender.send).first();
    expect(actualMailOptions.to).toEqual([
      {
        address: 'divertTo0@test.com',
        name: 'Diverted from actual1.at.address.com, actual2.at.address.com, actual3.at.address.com',
      },
    ]);
  });

  it('should divert to multiple alternate address', async () => {
    mailOptions = {
      to: 'actualTO@address.com',
      cc: 'actualCC@address.com',
      bcc: 'actualBCC@address.com',
    };
    setupDivertedEmails(2);

    diverter = new MailDiverter(aMailSender, config);
    await diverter.send(context, mailOptions);

    const [, actualMailOptions] = capture(mockedMailSender.send).first();
    expect(actualMailOptions.to).toEqual([
      { address: 'divertTo0@test.com', name: 'Diverted from actualTO.at.address.com' },
      { address: 'divertTo1@test.com', name: 'Diverted from actualTO.at.address.com' },
    ]);
    expect(actualMailOptions.cc).toEqual([
      { address: 'divertTo0@test.com', name: 'Diverted from actualCC.at.address.com' },
      { address: 'divertTo1@test.com', name: 'Diverted from actualCC.at.address.com' },
    ]);
    expect(actualMailOptions.bcc).toEqual([
      { address: 'divertTo0@test.com', name: 'Diverted from actualBCC.at.address.com' },
      { address: 'divertTo1@test.com', name: 'Diverted from actualBCC.at.address.com' },
    ]);
  });

  const verifyConstructionFails = () => {
    expect(() => {
      new MailDiverter(aMailSender, config);
    }).toThrowError('No divert-to email address(es) defined');
  };

  const setupDivertedEmails = (count: number) => {
    const divertToAddresses = [];
    for (let i = 0; i < count; i++) {
      divertToAddresses.push(`divertTo${i}@test.com`);
    }
    // @ts-ignore
    config.devHooks = {
      divertEmailTo: divertToAddresses,
    };
  };
});
