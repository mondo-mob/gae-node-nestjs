import * as Datastore from '@google-cloud/datastore';
import { Injectable } from '@nestjs/common';
import { Configuration } from '../';

@Injectable()
export class DatastoreProvider {
  private readonly datastoreConnection: Datastore;

  constructor(configuration: Configuration) {
    const { projectId, apiEndpoint } = configuration;

    this.datastoreConnection = new Datastore({
      projectId,
      apiEndpoint,
    });
  }

  get datastore(): Datastore {
    return this.datastoreConnection;
  }
}
