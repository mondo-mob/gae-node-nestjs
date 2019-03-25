import * as t from 'io-ts';
import { Repository } from '../datastore/repository';
import { DatastoreProvider } from '../datastore/datastore.provider';
declare const passwordReset: t.InterfaceType<{
    id: t.StringType;
    accountId: t.StringType;
    createdAt: t.Type<Date, Date, t.mixed>;
}, t.TypeOfProps<{
    id: t.StringType;
    accountId: t.StringType;
    createdAt: t.Type<Date, Date, t.mixed>;
}>, t.OutputOfProps<{
    id: t.StringType;
    accountId: t.StringType;
    createdAt: t.Type<Date, Date, t.mixed>;
}>, t.mixed>;
export declare type PasswordReset = t.TypeOf<typeof passwordReset>;
export declare class PasswordResetRepository extends Repository<PasswordReset> {
    constructor(datastoreProvider: DatastoreProvider);
}
declare const userInvite: t.InterfaceType<{
    id: t.StringType;
    email: t.StringType;
    createdAt: t.Type<Date, Date, t.mixed>;
    userId: t.StringType;
    roles: t.ArrayType<t.StringType, string[], string[], t.mixed>;
}, t.TypeOfProps<{
    id: t.StringType;
    email: t.StringType;
    createdAt: t.Type<Date, Date, t.mixed>;
    userId: t.StringType;
    roles: t.ArrayType<t.StringType, string[], string[], t.mixed>;
}>, t.OutputOfProps<{
    id: t.StringType;
    email: t.StringType;
    createdAt: t.Type<Date, Date, t.mixed>;
    userId: t.StringType;
    roles: t.ArrayType<t.StringType, string[], string[], t.mixed>;
}>, t.mixed>;
export declare type UserInvite = t.TypeOf<typeof userInvite>;
export declare class UserInviteRepository extends Repository<UserInvite> {
    constructor(datastoreProvider: DatastoreProvider);
}
declare const loginCredentials: t.Type<t.TypeOfProps<{
    id: t.StringType;
    userId: t.StringType;
    password: t.StringType;
    type: t.LiteralType<"password">;
}> | t.TypeOfProps<{
    id: t.StringType;
    userId: t.StringType;
    type: t.LiteralType<"google">;
}> | t.TypeOfProps<{
    id: t.StringType;
    userId: t.StringType;
    type: t.LiteralType<"saml">;
}> | t.TypeOfProps<{
    id: t.StringType;
    userId: t.StringType;
    type: t.LiteralType<"auth0">;
}>, t.OutputOfProps<{
    id: t.StringType;
    userId: t.StringType;
    password: t.StringType;
    type: t.LiteralType<"password">;
}> | t.OutputOfProps<{
    id: t.StringType;
    userId: t.StringType;
    type: t.LiteralType<"google">;
}> | t.OutputOfProps<{
    id: t.StringType;
    userId: t.StringType;
    type: t.LiteralType<"saml">;
}> | t.OutputOfProps<{
    id: t.StringType;
    userId: t.StringType;
    type: t.LiteralType<"auth0">;
}>, t.mixed>;
export declare type LoginCredentials = t.TypeOf<typeof loginCredentials>;
export declare class CredentialRepository extends Repository<LoginCredentials> {
    constructor(datastore: DatastoreProvider);
}
export {};
