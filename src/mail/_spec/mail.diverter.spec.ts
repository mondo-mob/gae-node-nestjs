import {anyFunction, anyOfClass, capture, instance, mock, verify, when} from 'ts-mockito';
import {Context, IUser} from '../..';
import {Configuration} from '../../configuration';
import {DatastoreLoader} from '../../datastore/loader';
import {MailDiverter} from '../mail.diverter';
import {Address, Options} from 'nodemailer/lib/mailer';
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
    return;
  }
}

describe('MailDiverter', () => {

  let diverter: MailDiverter;
  let mailOptions: Options;
  let config: Configuration;
  let aMailSender: MailSender;
  const mockedMailSender = mock(MockMailSender);
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
    }

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
    // config.devHooks = {divertEmailTo: []};
    setupDivertedEmails(0);
    verifyConstructionFails()
  });

  xit('should divert single email to alternate address', () => {
    mailOptions = {
      to: 'actual@address.com',
    };
    setupDivertedEmails(1);
    diverter = new MailDiverter(config, aMailSender);
    diverter.send(context, mailOptions);
    verify(mockedMailSender.send(context, mailOptions)).called();
    const [firstArg, secondArg] = capture(mockedMailSender.send).first();
    expect(secondArg.to).toBe('divertTo0@test.com');
  });

  const verifyConstructionFails = () => {
    expect(() => {
      new MailDiverter(config, aMailSender)
    })
      .toThrowError('No divert-to email address(es) defined')
  };

  const setupDivertedEmails = (count: number) => {
    // @ts-ignore
    config.devHooks = {
      divertEmailTo: [...Array(count).keys()].map(index => {`divertTo${index}@test.com`}),
    };
  }
});