import { Datastore } from '@google-cloud/datastore';
import * as t from 'io-ts';
import { Context } from '../datastore/context';
import { Index } from '../datastore/loader';
import { Repository, RepositoryOptions } from '../datastore/repository';
import { asArray, Omit, OneOrMany } from '../util/types';
import { Page, SearchFields, SearchResults, SearchService, Sort } from './search.service';

interface SearchableRepositoryOptions<T extends { id: any }> extends RepositoryOptions<T> {
  searchIndex: Index<Omit<T, 'id'>>;
}

export class SearchableRepository<T extends { id: string }> extends Repository<T> {
  constructor(
    datastore: Datastore,
    protected readonly searchService: SearchService,
    kind: string,
    validator: t.Type<T>,
    protected readonly options: SearchableRepositoryOptions<T>,
  ) {
    super(datastore, kind, validator, options);
  }

  async save(context: Context, entities: T): Promise<T>;
  async save(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async save(context: Context, entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    const savedEntities = await super.save(context, entities as any);
    await this.index(savedEntities);
    return savedEntities;
  }

  async update(context: Context, entities: T): Promise<T>;
  async update(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async update(context: Context, entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    const savedEntities = await super.update(context, entities as any);
    await this.index(savedEntities);
    return savedEntities;
  }

  async insert(context: Context, entities: T): Promise<T>;
  async insert(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async insert(context: Context, entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    const savedEntities = await super.insert(context, entities as any);
    await this.index(savedEntities);
    return savedEntities;
  }

  async upsert(context: Context, entities: T): Promise<T>;
  async upsert(context: Context, entities: ReadonlyArray<T>): Promise<ReadonlyArray<T>>;
  async upsert(context: Context, entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    const savedEntities = await super.upsert(context, entities as any);
    await this.index(savedEntities);
    return savedEntities;
  }

  async search(context: Context, searchFields: SearchFields, sort?: Sort) {
    const queryResults = await this.searchService.query(this.kind, searchFields, sort);
    const requests = await this.get(context, queryResults.ids);
    return requests!;
  }

  async searchWithPagination(
    context: Context,
    searchFields: SearchFields,
    sort?: Sort,
    page?: Page,
  ): Promise<SearchResults<T>> {
    const queryResults = await this.searchService.query(this.kind, searchFields, sort, page);
    const requests = await this.get(context, queryResults.ids);
    return {
      resultCount: queryResults.resultCount,
      limit: queryResults.limit,
      offset: queryResults.offset,
      results: requests,
    };
  }

  private index(entities: OneOrMany<T>) {
    const entitiesArr = asArray(entities);
    const entries = entitiesArr.map(entity => {
      const fields = Object.keys(this.options.searchIndex).reduce(
        (obj: { [key: string]: object }, fieldName: string) => {
          obj[fieldName] = entity[fieldName];
          return obj;
        },
        {},
      );

      return {
        id: entity.id,
        fields,
      };
    });

    return this.searchService.index(this.kind, entries);
  }
}
