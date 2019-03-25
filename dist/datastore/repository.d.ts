import { Datastore } from '@google-cloud/datastore';
import { entity as Entity } from '@google-cloud/datastore/build/src/entity';
import { RunQueryInfo } from '@google-cloud/datastore/build/src/query';
import * as t from 'io-ts';
import { Omit } from '../util/types';
import { Context } from './context';
import { Index, QueryOptions } from './loader';
export interface RepositoryOptions<T extends {
    id: any;
}> {
    defaultValues?: Partial<Omit<T, 'id'>>;
    index?: Index<Omit<T, 'id'>>;
}
export declare function buildExclusions<T>(input: T, schema?: Index<T>, path?: string): string[];
export declare const datastoreKey: t.Type<Entity.Key, Entity.Key, t.mixed>;
export declare const dateType: t.Type<Date, Date, t.mixed>;
export declare class Repository<T extends {
    id: string;
}> {
    private readonly datastore;
    protected readonly kind: string;
    protected readonly options: RepositoryOptions<T>;
    private readonly validator;
    constructor(datastore: Datastore, kind: string, validator: t.Type<T>, options?: RepositoryOptions<T>);
    getRequired(context: Context, id: string): Promise<T>;
    get(context: Context, id: string): Promise<T | undefined>;
    get(context: Context, id: ReadonlyArray<string>): Promise<ReadonlyArray<T> | undefined>;
    query(context: Context, options?: Partial<QueryOptions<T>>): Promise<[ReadonlyArray<T>, RunQueryInfo]>;
    save(context: Context, entities: T): Promise<T>;
    save(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
    update(context: Context, entities: T): Promise<T>;
    update(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
    insert(context: Context, entities: T): Promise<T>;
    insert(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
    upsert(context: Context, entities: T): Promise<T>;
    upsert(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
    reindex(context: Context, operation?: ((input: T) => T | Promise<T>)): Promise<ReadonlyArray<T>>;
    delete(context: Context, ...ids: string[]): Promise<void>;
    deleteAll(context: Context): Promise<void>;
    key: (name: string) => Entity.Key;
    private validate;
    private applyMutation;
}
