import { DatastoreLoader } from './loader';
import { Datastore } from '@google-cloud/datastore';
declare const ContextType: unique symbol;
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
export declare const Ctxt: (data?: any, ...pipes: (import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>>)[]) => ParameterDecorator;
export interface Context<User = IUser> {
    datastore: DatastoreLoader;
    user?: User;
    hasAnyRole(...roles: string[]): boolean;
    [ContextType]: true;
}
export declare function isContext(value: object): value is Context;
export declare const newContext: (datastore: Datastore) => Context<IUser>;
export declare const transaction: <T>(context: Context<IUser>, callback: (context: Context<IUser>) => Promise<T>) => Promise<T>;
export {};
