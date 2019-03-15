import { Inject, Injectable } from '@nestjs/common';
import * as Logger from 'bunyan';
import fetch, { Response } from 'node-fetch';
import { Configuration, CONFIGURATION, createLogger } from '..';

interface IndexEntry {
  id: string;
  fields: { [key: string]: string };
}

export interface Sort {
  field: string;
  descending?: boolean;
}

export declare type Operator = '=' | '!=';

export interface Fields {
  [key: string]: string | string[] | Predicate;
}

export interface Predicate {
  op: Operator;
  value: string | string[];
}

@Injectable()
export class SearchService {
  private logger: Logger;

  constructor(@Inject(CONFIGURATION) private readonly configuration: Configuration) {
    this.logger = createLogger('search-service');
  }

  index(entityName: string, entries: IndexEntry[]) {
    this.logger.info(`Indexing ${entries.length} ${entityName} entities`);

    this.logger.info(JSON.stringify(entries));

    return this.post('/index', {
      entityName,
      entries,
    });
  }

  async query(entityName: string, fields: Fields, sort?: Sort): Promise<ReadonlyArray<string>> {
    const resp = await this.post('/query', {
      entityName,
      fields: this.normaliseFields(fields),
      sort,
    });

    const ids = await resp.json();
    this.logger.info(`Query returned ${ids.length} ids`);
    return ids;
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

  private normaliseFields(fields: Fields): Fields {
    return Object.keys(fields).reduce((result: Fields, key) => {
      result[key] = this.toPredicate(fields[key]);
      return result;
    }, {});
  }

  private toPredicate(input: string | string[] | Predicate): Predicate {
    if ((input as any).op !== undefined) {
      return input as Predicate;
    }

    return {
      op: '=',
      value: input as string | string[],
    };
  }
}
