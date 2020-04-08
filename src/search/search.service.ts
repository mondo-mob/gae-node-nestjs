import { Inject, Injectable } from '@nestjs/common';
import * as Logger from 'bunyan';
import fetch, { Response } from 'node-fetch';
import { Configuration, CONFIGURATION, createLogger } from '..';

interface IndexEntry {
  id: string;
  fields: { [key: string]: object };
}

export interface Sort {
  field: string;
  descending?: boolean;
}

export interface Page {
  limit: number;
  offset: number;
}

export interface QueryResults {
  resultCount: number;
  limit: number;
  offset: number;
  ids: string[];
}

export interface SearchResults<T> {
  resultCount: number;
  limit: number;
  offset: number;
  results: ReadonlyArray<T> | undefined;
}

export declare type Operator = '=' | '!=' | '>' | '<' | '>=' | '<=';

export interface SearchFields {
  [key: string]: string | string[] | Predicate | Predicate[];
}

export interface Predicate {
  op: Operator;
  value: string | string[] | number | Date;
}

export interface SearchPredicate extends Predicate {
  field: string;
}

const isPredicate = (value: any): value is Predicate => {
  return (value as Predicate).op !== undefined;
};

const isPredicateArray = (value: any): value is Predicate[] => {
  return Array.isArray(value) && value.length > 0 && isPredicate(value[0]);
};

@Injectable()
export class SearchService {
  private logger: Logger;

  constructor(@Inject(CONFIGURATION) private readonly configuration: Configuration) {
    this.logger = createLogger('search-service');
  }

  index(entityName: string, entries: IndexEntry[]) {
    this.logger.info(`Indexing ${entries.length} ${entityName} entities`);

    return this.post('/index', {
      entityName,
      entries,
    });
  }

  delete(entityName: string, ...ids: string[]) {
    return this.post('/delete', {
      entityName,
      ids,
    });
  }

  deleteAll(entityName: string) {
    return this.post('/deleteAll', {
      entityName,
    });
  }

  async query(entityName: string, fields: SearchFields, sort?: Sort, page?: Page): Promise<QueryResults> {
    const resp = await this.post('/query', {
      entityName,
      fields: this.normaliseFields(fields),
      sort,
      page,
    });

    const queryResults = await resp.json();
    this.logger.info(`Query returned ${queryResults.ids.length} ids of total ${queryResults.resultCount}`);
    return queryResults;
  }

  private post(path: string, body: object): Promise<Response> {
    if (!this.configuration.searchServiceEndpoint) {
      throw new Error('searchServiceEndpoint must be configured in order to use the SearchService');
    }

    return fetch(this.configuration.searchServiceEndpoint + path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private normaliseFields(fields: SearchFields): SearchPredicate[] {
    return Object.keys(fields).reduce((result: SearchPredicate[], key) => {
      const field = fields[key];
      if (isPredicateArray(field)) {
        field.forEach(predicate => result.push(this.toSearchPredicate(key, predicate)));
      } else {
        result.push(this.toSearchPredicate(key, field));
      }
      return result;
    }, []);
  }

  private toSearchPredicate(fieldName: string, input: string | string[] | Predicate): SearchPredicate {
    return isPredicate(input)
      ? {
          field: fieldName,
          op: input.op,
          value: input.value,
        }
      : {
          field: fieldName,
          op: '=',
          value: input,
        };
  }
}
