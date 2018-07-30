import { DatastoreLoader } from './loader';
import * as Datastore from '@google-cloud/datastore';

const ContextType = Symbol();

export interface IUser {
  id: string;
  roles?: ReadonlyArray<string>;
}

export interface Context<User = IUser> {
  datastore: DatastoreLoader;
  user?: User;
  [ContextType]: true;
}

export function isContext(value: object): value is Context {
  return !!(value as any)[ContextType];
}

export const newContext = (datastore: Datastore): Context =>
  ({
    datastore: new DatastoreLoader(datastore, {
      [ContextType]: true,
    } as Context),
    [ContextType]: true,
  } as Context);
export const transaction = async <T>(
  context: Context,
  callback: (context: Context) => Promise<T>,
): Promise<T> => {
  return await callback(context);
};
