import { Module } from '@nestjs/common';
import { StorageProvider } from './gcloud/storage.provider';
import { DatastoreProvider } from './datastore/datastore.provider';

export { Repository, dateType } from './datastore/repository';
export { Transactional } from './datastore/transactional';
export { DatastoreProvider } from './datastore/datastore.provider';
export { createLogger, rootLogger, BunyanLogger } from './gcloud/logging';
export { StorageProvider } from './gcloud/storage.provider';
export { Context, isContext, newContext, IUser } from './datastore/context';
export { TaskQueue } from './gcloud/tasks';
export { Filters, Filter } from './datastore/loader'

export interface Configuration {
  isDevelopment(): boolean;
  bucket: string;
  environment: string;
  projectId: string;
  location: string;
  host: string;
  apiEndpoint?: string;
}

export interface Options {
  configuration: { new(): any }
}

export function module(options: Options): { new(): {} } {
  class GCloudModule {}

  Module({
    imports: [options.configuration],
    providers: [StorageProvider, DatastoreProvider],
    exports: [StorageProvider, DatastoreProvider],
  })(GCloudModule);

  return GCloudModule;
}
