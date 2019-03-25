import { Datastore, Transaction } from '@google-cloud/datastore';
import { entity as Entity } from '@google-cloud/datastore/build/src/entity';
import { OrderOptions, RunQueryInfo } from '@google-cloud/datastore/build/src/query';
import { OneOrMany } from '../util/types';
import { Context } from './context';
import { Filters } from './filters';
export declare type Index<T> = true | {
    [K in keyof T]?: T[K] extends Array<any> ? Index<T[K][0]> : Index<T[K]>;
};
export interface QueryOptions<T> {
    select: OneOrMany<keyof T & string>;
    filters: Filters<T>;
    sort: {
        property: string;
        options: OrderOptions;
    };
    groupBy: OneOrMany<keyof T & string>;
    start: string;
    end: string;
    hasAnscestor: Entity.Key;
    offset: number;
    limit: number;
}
export interface DatastorePayload<T> {
    key: Entity.Key;
    data: T | object;
    excludeFromIndexes?: string[];
}
export declare type WithDatstoreKey<T> = T & {
    [Entity.KEY_SYMBOL]: Entity.Key;
};
export declare class DatastoreLoader {
    private readonly loader;
    private readonly datastore;
    private readonly parentContext;
    private readonly logger;
    constructor(datastore: Datastore | Transaction, context: Context);
    get(id: Entity.Key[]): Promise<object[]>;
    save(entities: ReadonlyArray<DatastorePayload<any>>): Promise<void>;
    delete(entities: ReadonlyArray<Entity.Key>): Promise<void>;
    update(entities: ReadonlyArray<DatastorePayload<any>>): Promise<void>;
    upsert(entities: ReadonlyArray<DatastorePayload<any>>): Promise<void>;
    insert(entities: ReadonlyArray<DatastorePayload<any>>): Promise<void>;
    executeQuery<T>(kind: string, options: Partial<QueryOptions<T>>): Promise<[WithDatstoreKey<T>[], RunQueryInfo]>;
    inTransaction<T>(callback: (tx: Context) => Promise<T>): Promise<T>;
    private applyBatched;
    private load;
}
