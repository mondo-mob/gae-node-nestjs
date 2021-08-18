import { Datastore } from '@google-cloud/datastore';
import * as t from 'io-ts';
import { Context } from '../datastore/context';
import { Index } from '../datastore/loader';
import { Repository, RepositoryOptions } from '../datastore/repository';
import { asArray, Omit, OneOrMany } from '../util/types';
import { Page, SearchFields, SearchResults, SearchService, Sort } from './search.service';
import { createLogger } from '../logging';

interface SearchableRepositoryOptions<T extends { id: any }> extends RepositoryOptions<T> {
  searchIndex: Index<Omit<T, 'id'>>;
}

export class SearchableRepository<T extends { id: string }> extends Repository<T> {
  private baseLogger = createLogger('searchable-repository');

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

  async delete(context: Context, ...ids: string[]): Promise<void> {
    await super.delete(context, ...ids);
    await this.searchService.delete(this.kind, ...ids);
  }

  async deleteAll(context: Context): Promise<void> {
    await super.deleteAll(context);
    await this.searchService.deleteAll(this.kind);
  }

  async search(context: Context, searchFields: SearchFields, sort?: Sort) {
    const queryResults = await this.searchService.query(this.kind, searchFields, sort);
    const requests = await this.fetchResults(context, queryResults.ids);
    return requests!;
  }

  async searchWithPagination(
    context: Context,
    searchFields: SearchFields,
    sort?: Sort,
    page?: Page,
  ): Promise<SearchResults<T>> {
    const queryResults = await this.searchService.query(this.kind, searchFields, sort, page);
    const requests = await this.fetchResults(context, queryResults.ids);
    return {
      resultCount: queryResults.resultCount,
      limit: queryResults.limit,
      offset: queryResults.offset,
      results: requests,
    };
  }

  /**
   * Reindex all entities in datastore
   *
   * Loads all entities into memory and applies some mutation to them before re-saving them. Note: the save is batched
   * to cater for limits in the max index sized in the datastore
   *
   * @param context
   * @param operation (Optional) The operation to perform on each entity, returning the new
   * form. By default this will return the same instance.
   */
  async reindex(context: Context, operation: (input: T) => T | Promise<T> = input => input): Promise<readonly T[]> {
    const [allEntities] = await this.query(context);
    this.baseLogger.info(`Saving ${allEntities.length} searchable entities`);
    const batchSize = 100;
    const allUpdatedEntities = [];
    for (let i = 0; i < allEntities.length; i += batchSize) {
      const batchOfEntities = allEntities.slice(i, i + batchSize);
      const updatedEntities = await Promise.all(batchOfEntities.map(operation));
      this.baseLogger.info(`Saving batch of ${batchOfEntities.length} updated searchable entities`);
      const batchUpdatedEntities = await this.update(context, updatedEntities);
      allUpdatedEntities.push(...batchUpdatedEntities);
    }
    return allUpdatedEntities;
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

  private async fetchResults(context: Context, ids: string[]) {
    const results = await this.get(context, ids);
    if (results && results.some(result => !result)) {
      this.baseLogger.warn(
        'Search results contained at least one null value - search index likely out of sync with datastore',
      );
      return results.filter(result => !!result);
    }
    return results;
  }
}
