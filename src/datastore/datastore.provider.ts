import * as Datastore from '@google-cloud/datastore';
import { Inject, Injectable } from '@nestjs/common';
import { Configuration, createLogger } from '../';
import Logger = require('bunyan');

@Injectable()
export class DatastoreProvider {
  private readonly datastoreConnection: Datastore;
  private readonly logger: Logger = createLogger('datastore-provider');

  constructor(@Inject('Configuration') configuration: Configuration) {
    const { projectId, apiEndpoint } = configuration;

    if (apiEndpoint) {
      this.logger.info('API endpoint provided for datastore, connecting to local emulator.');
    }

    this.datastoreConnection = new Datastore({
      projectId,
      apiEndpoint,
    });
  }

  get datastore(): Datastore {
    return this.datastoreConnection;
  }
}
