import * as t from 'io-ts';
import * as Datastore from '@google-cloud/datastore';
import { DatastoreKey, DatastorePayload } from '@google-cloud/datastore/entity';
import { reporter } from 'io-ts-reporters';
import { DatastoreLoader, Index, QueryOptions } from './loader';
import * as _ from 'lodash';
import { asArray, Omit, OneOrMany } from '../util/types';
import { Context } from './context';
import { QueryInfo } from '@google-cloud/datastore/query';

interface RepositoryOptions<T extends { id: any }> {
  defaultValues?: Partial<Omit<T, 'id'>>;
  index?: Index<Omit<T, 'id'>>;
}

export function buildExclusions<T>(
  input: T,
  schema: Index<T> = {},
  path: string = '',
): string[] {
  if (schema === true) {
    return [];
  } else if (Array.isArray(input)) {
    return _.chain(input)
      .flatMap(value => {
        return buildExclusions(value, schema, `${path}[]`);
      })
      .push(`${path}[]`)
      .uniq()
      .value();
  } else if (typeof input === 'object') {
    const paths = _.flatMap<object, string>(input as any, (value, key) => {
      return buildExclusions(
        value,
        (schema as any)[key],
        `${path}${path.length > 0 ? '.' : ''}${key}`,
      );
    });

    if (path) {
      paths.push(path);
    }

    return paths;
  }

  return [path];
}

export const datastoreKey = new t.Type<DatastoreKey>(
  'DatastoreKey',
  (input): input is DatastoreKey => typeof input === 'object',
  input => t.success(input as DatastoreKey),
  (value: DatastoreKey) => value,
);

export const dateType = new t.Type<Date>(
  'DateType',
  (m): m is Date => m instanceof Date,
  (m, c) =>
    m instanceof Date ? t.success(m) : t.failure('Value is not date', c),
  a => a,
);

class LoadError extends Error {
  constructor(kind: string, id: string, errors: string[]) {
    super(
      `"${kind}" with id "${id}" failed to load due to ${
        errors.length
      } errors:\n${errors.join('\n')}`,
    );
  }
}

class SaveError extends Error {
  constructor(kind: string, id: string, errors: string[]) {
    super(
      `"${kind}" with id "${id}" failed to save due to ${
        errors.length
      } errors:\n${errors.join('\n')}`,
    );
  }
}

export class Repository<T extends { id: string }> {
  private readonly validator: t.Type<T>;

  constructor(
    private readonly datastore: Datastore,
    protected readonly kind: string,
    validator: t.Type<T>,
    protected readonly options: RepositoryOptions<T> = {},
  ) {
    this.validator = validator;
  }

  async get(context: Context, id: string): Promise<T | undefined>;
  async get(
    context: Context,
    id: ReadonlyArray<string>,
  ): Promise<ReadonlyArray<T> | undefined>;
  async get(
    context: Context,
    ids: string | ReadonlyArray<string>,
  ): Promise<OneOrMany<T | undefined>> {
    const idArray = asArray(ids);
    const allKeys = idArray.map(this.key);

    const results = await context.datastore.get(allKeys);

    const validatedResults = results.map((result, idx) => {
      if (result) {
        return this.validate(idArray[idx], result);
      }

      return result;
    });

    if (validatedResults.length === 1) {
      return validatedResults[0];
    } else {
      return validatedResults;
    }
  }

  async query(
    context: Context,
    options: Partial<QueryOptions<T>> = {},
  ): Promise<[ReadonlyArray<T>, QueryInfo]> {
    const [results, queryInfo] = await context.datastore.executeQuery<T>(this.kind, options);

    return [results.map<any>(value =>
      this.validate(value[Datastore.KEY].name!, _.omit(value, Datastore.KEY)),
    ), queryInfo];
  }

  async save(context: Context, entities: T): Promise<T>;
  async save(
    context: Context,
    entities: ReadonlyArray<T>,
  ): Promise<ReadonlyArray<T>>;
  async save(context: Context, entities: OneOrMany<T>): Promise<OneOrMany<T>> {
    return this.applyMutation(context, entities, (loader, e) => loader.save(e));
  }

  async update(context: Context, entities: T): Promise<T>;
  async update(
    context: Context,
    entities: ReadonlyArray<T>,
  ): Promise<ReadonlyArray<T>>;
  async update(
    context: Context,
    entities: OneOrMany<T>,
  ): Promise<OneOrMany<T>> {
    return this.applyMutation(context, entities, (loader, e) =>
      loader.update(e),
    );
  }

  async insert(context: Context, entities: T): Promise<T>;
  async insert(
    context: Context,
    entities: ReadonlyArray<T>,
  ): Promise<ReadonlyArray<T>>;
  async insert(
    context: Context,
    entities: OneOrMany<T>,
  ): Promise<OneOrMany<T>> {
    return this.applyMutation(context, entities, (loader, e) =>
      loader.insert(e),
    );
  }

  async upsert(context: Context, entities: T): Promise<T>;
  async upsert(
    context: Context,
    entities: ReadonlyArray<T>,
  ): Promise<ReadonlyArray<T>>;
  async upsert(
    context: Context,
    entities: OneOrMany<T>,
  ): Promise<OneOrMany<T>> {
    return this.applyMutation(context, entities, (loader, e) =>
      loader.upsert(e),
    );
  }

  /**
   * Reindex all entities in datastore
   *
   * Loads all entities into memory and applies some mutation to them before resaving them
   *
   * @param context
   * @param operation
   */
  async reindex(context: Context, operation: (input: T) => T | Promise<T>) {
    const allEntities = await this.query(context);

    const updatedEntities = await Promise.all(allEntities.map(operation));

    return this.update(context, updatedEntities);
  }

  async delete(context: Context, ...ids: string[]): Promise<void> {
    const allIds = ids.map(id => this.key(id));
    await context.datastore.delete(allIds);
  }

  async deleteAll(context: Context): Promise<void> {
    const allEntities = await this.query(context);
    const allIds = allEntities.map(value => this.key(value.id));
    await context.datastore.delete(allIds);
  }

  public key = (name: string): DatastoreKey => {
    return this.datastore.key([this.kind, name]);
  };

  private validate = (id: string, value: object): T => {
    const entity = {
      ...(this.options.defaultValues as any),
      ...value,
      id,
    };

    const validation = this.validator.decode(entity);

    if (validation.isLeft()) {
      const errors = reporter(validation);
      throw new LoadError(this.kind, id, errors);
    }

    return validation.value;
  };

  private async applyMutation(
    context: Context,
    entities: OneOrMany<T>,
    mutation: (
      loader: DatastoreLoader,
      entities: ReadonlyArray<DatastorePayload<T>>,
    ) => Promise<any>,
  ): Promise<OneOrMany<T>> {
    const entitiesToSave = asArray(entities)
      .map(entity => {
        const validation = this.validator.decode(entity);

        if (validation.isLeft()) {
          const errors = reporter(validation);
          throw new SaveError(this.kind, entity.id, errors);
        }

        return validation.value;
      })
      .map(data => {
        const withoutId = _.omit(data, 'id');
        return {
          key: this.key(data.id),
          data: withoutId,
          excludeFromIndexes: buildExclusions(withoutId, this.options.index),
        } as DatastorePayload<T>;
      });

    await mutation(context.datastore, entitiesToSave);

    return entities;
  }
}
