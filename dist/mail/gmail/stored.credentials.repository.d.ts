import * as t from 'io-ts';
import { Repository } from '../../datastore/repository';
import { DatastoreProvider } from '../../datastore/datastore.provider';
declare const storedCredential: t.InterfaceType<{
    id: t.StringType;
    value: t.StringType;
}, t.TypeOfProps<{
    id: t.StringType;
    value: t.StringType;
}>, t.OutputOfProps<{
    id: t.StringType;
    value: t.StringType;
}>, t.mixed>;
export declare type StoredCredential = t.TypeOf<typeof storedCredential>;
export declare class StoredCredentialsRepository extends Repository<StoredCredential> {
    constructor(datastore: DatastoreProvider);
}
export {};
