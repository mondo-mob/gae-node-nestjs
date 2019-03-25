import * as t from 'io-ts';
import { Repository } from '../datastore/repository';
import { DatastoreProvider } from '../datastore/datastore.provider';
declare const loginIdentifier: t.InterfaceType<{
    id: t.StringType;
    userId: t.StringType;
    createdAt: t.Type<Date, Date, t.mixed>;
}, t.TypeOfProps<{
    id: t.StringType;
    userId: t.StringType;
    createdAt: t.Type<Date, Date, t.mixed>;
}>, t.OutputOfProps<{
    id: t.StringType;
    userId: t.StringType;
    createdAt: t.Type<Date, Date, t.mixed>;
}>, t.mixed>;
export declare type LoginIdentifier = t.TypeOf<typeof loginIdentifier>;
export declare class LoginIdentifierRepository extends Repository<LoginIdentifier> {
    constructor(datastore: DatastoreProvider);
}
export {};
