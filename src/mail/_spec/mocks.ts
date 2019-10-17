import { anyFunction, instance, mock, when } from 'ts-mockito';
import { DatastoreLoader } from '../../datastore/loader';
import { Configuration, Context, IUser, MailSender } from '../..';
import { Options } from 'nodemailer/lib/mailer';

export const testConfiguration = (overrides?: Partial<Configuration>): Configuration => ({
  auth: {}, // required but not important for test
  bucket: 'required but not important for test',
  environment: 'required but not important for test',
  gmailUser: 'required but not important for test',
  host: 'required but not important for test',
  location: 'required but not important for test',
  projectId: 'required but not important for test',
  systemSecret: Buffer.from([]), // required but not important for test
  isDevelopment(): boolean {
    return true;
  },
  ...overrides,
});

export const mockContext = () => {
  const datastoreLoader = mock(DatastoreLoader);

  const context = {
    datastore: instance(datastoreLoader),
  } as Context;

  when(datastoreLoader.inTransaction(anyFunction())).thenCall((cb: any) => cb(context));

  return context;
};

export class MockMailSender implements MailSender {
  async send(context: Context<IUser>, mailOptions: Options): Promise<void> {}
}
