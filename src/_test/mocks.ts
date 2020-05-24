import { anyFunction, anything, instance, mock, when } from 'ts-mockito';
import { DatastoreLoader } from '../datastore/loader';
import { Configuration, MailSender } from '..';
import { Context, IUser } from '../datastore/context';
import { Options } from 'nodemailer/lib/mailer';
import { DatastoreProvider } from '../datastore/datastore.provider';
import { Datastore } from '@google-cloud/datastore';
import * as _ from 'lodash';

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

export const user = (overrides?: Partial<IUser>): IUser => {
  return {
    id: 'user1',
    email: 'user1@example.com',
    name: 'User 1',
    enabled: true,
    roles: [],
    ...overrides,
  };
};

export const mockContext = (options?: { user?: IUser; mockLoader?: DatastoreLoader }) => {
  const datastoreLoader = options?.mockLoader || mockDatastoreLoader();
  when(datastoreLoader.inTransaction(anyFunction())).thenCall((cb: any) => cb(context));

  const context = {
    datastore: instance(datastoreLoader),
    user: options?.user,
    props: [],
  } as any;

  context.hasAnyRole = (...roles: string[]) =>
    !!context.user && (context.user as IUser).roles.some((r) => _.includes(roles, r));

  when(datastoreLoader.inTransaction(anyFunction())).thenCall((cb: any) => cb(context));
  return context as Context;
};

export const mockDatastoreProvider = (): DatastoreProvider => {
  const datastore = mock(Datastore) as any;
  const datastoreProvider = mock(DatastoreProvider);
  when(datastoreProvider.datastore).thenReturn(instance(datastore));
  return instance(datastoreProvider);
};

export const mockDatastoreLoader = (): DatastoreLoader => {
  const datastoreLoader = mock(DatastoreLoader);
  when(datastoreLoader.save(anything())).thenCall((cbCtx: any, cbValue: any) => {
    return cbValue;
  });
  when(datastoreLoader.executeQuery(anything(), anything())).thenResolve([[], {}]);
  return datastoreLoader;
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
