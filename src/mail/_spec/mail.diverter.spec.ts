import {Options} from 'nodemailer/lib/mailer';
import {anyFunction, capture, instance, mock, when} from 'ts-mockito';
import {Context, IUser} from '../..';
import {Configuration} from '../../configuration';
import {DatastoreLoader} from '../../datastore/loader';
import {MailDiverter} from '../mail.diverter';
import {MailSender} from '../mail.sender';

export const mockContext = () => {
  const datastoreLoader = mock(DatastoreLoader);

  const context = {
    datastore: instance(datastoreLoader),
  } as Context;

  when(datastoreLoader.inTransaction(anyFunction())).thenCall((cb: any) =>
    cb(context),
  );

  return context;
};

export class MockMailSender implements MailSender {
  async send(context: Context<IUser>, mailOptions: Options): Promise<void> {
  }
}

describe('MailDiverter', () => {

  let diverter: MailDiverter;
  let mailOptions: Options;
  let config: Configuration;
  let aMailSender: MailSender;
  let mockedMailSender: MailSender;
  const context = mockContext();

  beforeEach(() => {
    config = {
      auth: {}, // required but not important for test
      bucket: 'required but not important for test',
      environment: 'required but not important for test',
      gmailUser: 'required but not important for test',
      host: 'required but not important for test',
      location: 'required but not important for test',
      projectId: 'required but not important for test',
      systemSecret: new Buffer([]), // required but not important for test
      isDevelopment(): boolean {
        return true;
      },
    };
    mockedMailSender = mock(MockMailSender);
    aMailSender = instance(mockedMailSender);
  });

  it('should fail to initialise if config.devHooks is undefined', () => {
    verifyConstructionFails();
  });

  it('should fail to initialise if config.devHooks.divertEmailTo is undefined', () => {
    config.devHooks = {};
    verifyConstructionFails()
  });

  it('should fail to initialise if config.devHooks.divertEmailTo is empty', () => {
    setupDivertedEmails(0);
    verifyConstructionFails()
  });

  it('should divert single email string to alternate address', async () => {
    mailOptions = {
      to: 'actual@address.com',
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(config, aMailSender);
    await diverter.send(context, mailOptions);

    const [firstArg, secondArg] = capture(mockedMailSender.send).first();
    expect(secondArg.to).toEqual([{address: 'divertTo0@test.com', name: 'Diverted from actual.at.address.com'}]);
    expect(secondArg.cc).toEqual([]);
    expect(secondArg.bcc).toEqual([]);
  });

  it('should divert to, cc and bcc to alternate address', async () => {
    mailOptions = {
      to: 'actualTO@address.com',
      cc: 'actualCC@address.com',
      bcc: 'actualBCC@address.com',
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(config, aMailSender);
    await diverter.send(context, mailOptions);

    const [firstArg, secondArg] = capture(mockedMailSender.send).first();
    expect(secondArg.to).toEqual([{address: 'divertTo0@test.com', name: 'Diverted from actualTO.at.address.com'}]);
    expect(secondArg.cc).toEqual([{address: 'divertTo0@test.com', name: 'Diverted from actualCC.at.address.com'}]);
    expect(secondArg.bcc).toEqual([{address: 'divertTo0@test.com', name: 'Diverted from actualBCC.at.address.com'}]);
  });

  it('should divert multiple email string to alternate address', async () => {
    mailOptions = {
      to: 'actual@address.com, actual2@another.com',
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(config, aMailSender);
    await diverter.send(context, mailOptions);

    const [firstArg, secondArg] = capture(mockedMailSender.send).first();
    expect(secondArg.to).toEqual([
      {address: 'divertTo0@test.com', name: 'Diverted from actual.at.address.com, actual2.at.another.com'},
    ]);
  });

  it('should divert Address type email to alternate address', async () => {
    mailOptions = {
      to: {name: 'Not that important', address: 'actual@address.com'},
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(config, aMailSender);
    await diverter.send(context, mailOptions);

    const [firstArg, secondArg] = capture(mockedMailSender.send).first();
    expect(secondArg.to).toEqual([
      {address: 'divertTo0@test.com', name: 'Diverted from actual.at.address.com'},
    ]);
  });

  it('should divert an array of email strings to alternate address', async () => {
    mailOptions = {
      to: [
        'actual1@address.com, actual2@address.com',
        'actual3@address.com',
      ],
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(config, aMailSender);
    await diverter.send(context, mailOptions);

    const [firstArg, secondArg] = capture(mockedMailSender.send).first();
    expect(secondArg.to).toEqual([
      {address: 'divertTo0@test.com', name: 'Diverted from actual1.at.address.com, actual2.at.address.com, actual3.at.address.com'},
    ]);
  });

  it('should divert an array of Address objects to alternate address', async () => {
    mailOptions = {
      to: [
        {name: 'Not that important', address: 'actual1@address.com'},
        {name: 'Not that important', address: 'actual2@address.com'},
        {name: 'Not that important', address: 'actual3@address.com'},
      ],
    };
    setupDivertedEmails(1);

    diverter = new MailDiverter(config, aMailSender);
    await diverter.send(context, mailOptions);

    const [firstArg, secondArg] = capture(mockedMailSender.send).first();
    expect(secondArg.to).toEqual([
      {address: 'divertTo0@test.com', name: 'Diverted from actual1.at.address.com, actual2.at.address.com, actual3.at.address.com'},
    ]);
  });

  it('should divert to multiple alternate address', async () => {
    mailOptions = {
      to: 'actualTO@address.com',
      cc: 'actualCC@address.com',
      bcc: 'actualBCC@address.com',
    };
    setupDivertedEmails(2);

    diverter = new MailDiverter(config, aMailSender);
    await diverter.send(context, mailOptions);

    const [firstArg, secondArg] = capture(mockedMailSender.send).first();
    expect(secondArg.to).toEqual([
      {address: 'divertTo0@test.com', name: 'Diverted from actualTO.at.address.com'},
      {address: 'divertTo1@test.com', name: 'Diverted from actualTO.at.address.com'},
      ]);
    expect(secondArg.cc).toEqual([
      {address: 'divertTo0@test.com', name: 'Diverted from actualCC.at.address.com'},
      {address: 'divertTo1@test.com', name: 'Diverted from actualCC.at.address.com'},
    ]);
    expect(secondArg.bcc).toEqual([
      {address: 'divertTo0@test.com', name: 'Diverted from actualBCC.at.address.com'},
      {address: 'divertTo1@test.com', name: 'Diverted from actualBCC.at.address.com'},
    ]);
  });

  const verifyConstructionFails = () => {
    expect(() => {
      new MailDiverter(config, aMailSender)
    })
      .toThrowError('No divert-to email address(es) defined')
  };

  const setupDivertedEmails = (count: number) => {
    const divertToAddresses = [];
    for (let i = 0; i < count; i++) {
      divertToAddresses.push(`divertTo${i}@test.com`)
    }
    // @ts-ignore
    config.devHooks = {
      divertEmailTo: divertToAddresses,
    };
  }
});