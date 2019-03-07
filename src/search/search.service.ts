import { Inject, Injectable } from '@nestjs/common';
import * as Logger from 'bunyan';
import fetch, { Response } from 'node-fetch';
import { Configuration, CONFIGURATION, createLogger } from '..';

interface IndexEntry {
  id: string;
  fields: { [key: string]: string };
}

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

  async query(entityName: string, fields: { [key: string]: string | string[] }): Promise<ReadonlyArray<string>> {
    const resp = await this.post('/query', {
      entityName,
      fields,
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
}
