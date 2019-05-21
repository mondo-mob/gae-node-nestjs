import { asArray, OneOrMany } from '../util/types';
import { Operator } from '@google-cloud/datastore/build/src/query';

export type Filter<T> = OneOrMany<T | ComplexFilter<T>>;

export interface ComplexFilter<T> {
  op: Operator;
  value: T;
}

export type Filters<T> = {
  [K in keyof T]?: T[K] extends Array<any>
    ? Filter<Partial<T[K][0]>>
    : T[K] extends Date ? Filter<T[K]>
    : T[K] extends object ? Filters<T[K]> : Filter<T[K]>
};

export function isComplexFilter<T>(filter: Filter<T>): filter is ComplexFilter<T> {
  return (filter as any).op !== undefined;
}

interface Query {
  filter(path: string, operation: Operator, value: any): this;
  filter(path: string, value: any): this;
}

export const buildFilters = <T, Q extends Query>(
  query: Q,
  filters: Filters<T>,
  pathPrefix: string = '',
): Q => {
  return Object
    .entries(filters)
    .reduce<Query>((q, [key, value]) => {
      if (!isComplexFilter(value) && typeof value === 'object' && !Array.isArray(value)) {
        return buildFilters(query, value, pathPrefix + `${key}.`);
      }

      const parameterFilters = asArray(value);

      for (const filter of parameterFilters) {
        if (isComplexFilter(filter)) {
          q = q.filter(pathPrefix + key, filter.op, filter.value);
        } else {
          q = q.filter(pathPrefix + key, filter);
        }
      }

      return q;
    }, query) as Q;
};
