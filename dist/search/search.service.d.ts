import { Response } from 'node-fetch';
import { Configuration } from '..';
interface IndexEntry {
    id: string;
    fields: {
        [key: string]: string;
    };
}
export interface Sort {
    field: string;
    descending?: boolean;
}
export declare type Operator = '=' | '!=';
export interface SearchFields {
    [key: string]: string | string[] | Predicate;
}
export interface Predicate {
    op: Operator;
    value: string | string[];
}
export declare class SearchService {
    private readonly configuration;
    private logger;
    constructor(configuration: Configuration);
    index(entityName: string, entries: IndexEntry[]): Promise<Response>;
    deleteAll(entityName: string): Promise<Response>;
    query(entityName: string, fields: SearchFields, sort?: Sort): Promise<ReadonlyArray<string>>;
    private post;
    private normaliseFields;
    private toPredicate;
}
export {};
