import { Module, NestModule } from '@nestjs/common';
import { StorageProvider } from './gcloud/storage.provider';
import { DatastoreProvider } from './datastore/datastore.provider';

export interface Configuration {
  isDevelopment(): boolean;
  bucket: string;
  environment: string;
  projectId: string;
  location: string;
  host: string;
  apiEndpoint: string;
}

export interface Options {
  configuration: { new(): NestModule }
}

export function module(options: Options) {
  return Module({
    imports: [options.configuration],
    providers: [StorageProvider, DatastoreProvider],
    exports: [StorageProvider, DatastoreProvider],
  })(class GCloudModule {});
}
