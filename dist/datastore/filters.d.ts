import { OneOrMany } from '../util/types';
import { Operator } from '@google-cloud/datastore/build/src/query';
export declare type Filter<T> = OneOrMany<T | ComplexFilter<T>>;
export interface ComplexFilter<T> {
    op: Operator;
    value: T;
}
export declare type Filters<T> = {
    [K in keyof T]?: T[K] extends Array<any> ? Filter<T[K][0]> : T[K] extends object ? Filters<T[K]> : Filter<T[K]>;
};
export declare function isComplexFilter<T>(filter: Filter<T>): filter is ComplexFilter<T>;
interface Query {
    filter(path: string, operation: Operator, value: any): this;
    filter(path: string, value: any): this;
}
export declare const buildFilters: <T, Q extends Query>(query: Q, filters: Filters<T>, pathPrefix?: string) => Q;
export {};
