import { anyFunction, instance, mock, when } from 'ts-mockito';
import { DatastoreLoader } from '../datastore/loader';
import { Configuration, Context, IUser, MailSender } from '..';
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
  async send(context: Context, mailOptions: Options): Promise<void> {}
}

export const isMock = (obj: any) => '__tsmockitoMocker' in obj;

/**
 * This is useful where a mock is too much or too hard (depending on what you're trying to mock).
 * Calling this as a generic typed function allows returning only the parts of the object you're trying to mock.
 * E.g., to mock a literal of a specific type:  e.g., Response from a call to fetch() where you only care are about the 'ok' property:
 * <pre>
 * const partialResponse = partialInstance<Response>({ok: true});
 * </pre>
 * @param props The properties on the partial instance you want to set
 *
 * @returns Created instance with only the properties you have set, not strictly adhering to the type's required properties.
 */
export const partialInstance = <T>(props: Partial<T> = {}): T => ({ ...props } as T);
