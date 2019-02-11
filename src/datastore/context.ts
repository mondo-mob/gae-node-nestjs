import { DatastoreLoader } from './loader';
import * as Datastore from '@google-cloud/datastore';
import { createParamDecorator } from '@nestjs/common';
import _ = require('lodash');

const ContextType = Symbol();

export interface IUserUpdates {
  email?: string;
  name?: string;
  enabled?: boolean;
  roles?: ReadonlyArray<string>;
  orgId?: string;
}

export interface IUserCreateRequest extends IUserUpdates {
  email: string;
}

export interface IUser extends IUserCreateRequest {
  id: string;
  enabled: boolean;
  roles: ReadonlyArray<string>;
  orgId?: string;
}

export const Ctxt = createParamDecorator((data, req) => req.context);

export interface Context<User = IUser> {
  datastore: DatastoreLoader;
  user?: User;
  hasAnyRole(...roles: string[]): boolean,
  [ContextType]: true;
}

export function isContext(value: object): value is Context {
  return !!(value as any)[ContextType];
}

export const newContext = (datastore: Datastore): Context => {
  const context: any = { [ContextType]: true };
  context.datastore = new DatastoreLoader(datastore, context);
  context.hasAnyRole = (...roles: string[]) =>
      !!context.user && (context.user as IUser).roles.some(r => _.includes(roles, r));
  return context;
};

export const transaction = async <T>(
  context: Context,
  callback: (context: Context) => Promise<T>,
): Promise<T> => {
  return await callback(context);
};
