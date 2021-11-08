import { DatastoreLoader } from './loader';
import { Datastore } from '@google-cloud/datastore';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import _ = require('lodash');
import { Request } from 'express';

const ContextType = Symbol();

export interface IUserUpdates {
  email?: string;
  name?: string;
  enabled?: boolean;
  roles?: ReadonlyArray<string>;
  orgId?: string;
  props?: any;
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

export const Ctxt = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.context;
});

export interface Context<User = IUser> {
  request: Request;
  datastore: DatastoreLoader;
  user?: User;
  hasAnyRole(...roles: string[]): boolean;
  props: {
    [key: string]: any;
  };
  [ContextType]: true;
}

export function isContext(value: object): value is Context {
  return !!(value as any)[ContextType];
}

export const newContext = (datastore: Datastore): Context => {
  const context: any = { [ContextType]: true, props: [] };
  context.datastore = new DatastoreLoader(datastore, context);
  context.hasAnyRole = (...roles: string[]) =>
    !!context.user && (context.user as IUser).roles.some(r => _.includes(roles, r));
  return context;
};

export const transaction = async <T>(context: Context, callback: (context: Context) => Promise<T>): Promise<T> => {
  return await callback(context);
};
