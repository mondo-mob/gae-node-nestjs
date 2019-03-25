import { Datastore } from '@google-cloud/datastore';
import * as t from 'io-ts';
import { Context } from '../datastore/context';
import { Index } from '../datastore/loader';
import { Repository, RepositoryOptions } from '../datastore/repository';
import { Omit } from '../util/types';
import { SearchFields, SearchService, Sort } from './search.service';
interface SearchableRepositoryOptions<T extends {
    id: any;
}> extends RepositoryOptions<T> {
    searchIndex: Index<Omit<T, 'id'>>;
}
export declare class SearchableRepository<T extends {
    id: string;
}> extends Repository<T> {
    protected readonly searchService: SearchService;
    protected readonly options: SearchableRepositoryOptions<T>;
    constructor(datastore: Datastore, searchService: SearchService, kind: string, validator: t.Type<T>, options: SearchableRepositoryOptions<T>);
    save(context: Context, entities: T): Promise<T>;
    save(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
    update(context: Context, entities: T): Promise<T>;
    update(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
    insert(context: Context, entities: T): Promise<T>;
    insert(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
    upsert(context: Context, entities: T): Promise<T>;
    upsert(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
    search(context: Context, searchFields: SearchFields, sort?: Sort): Promise<ReadonlyArray<T>>;
    private index;
}
export {};
