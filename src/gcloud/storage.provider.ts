import { Injectable } from '@nestjs/common';
import { Configuration } from '../index';
import * as GoogleCloudStorage from '@google-cloud/storage';
import * as Logger from 'bunyan';
import { Bucket, ConfigurationObject, Storage } from '@google-cloud/storage';
import { createLogger } from './logging';

@Injectable()
export class StorageProvider {
  private readonly _storage: Storage;
  private readonly _defaultBucket: Bucket;
  private readonly logger: Logger;

  constructor(private readonly configurationProvider: Configuration) {
    this.logger = createLogger('storage');
    const config: ConfigurationObject = {};
    if (configurationProvider.isDevelopment()) {
      this.logger.info(
        'Application is running locally, using keyfile.json credentials to connect to Google Cloud Storage',
      );
      config.keyFilename = './keyfile.json';
    }
    this._storage = GoogleCloudStorage(config);
    this.logger.info(
      `Default Google Cloud Storage bucket: ${configurationProvider.bucket}`,
    );
    this._defaultBucket = this.storage.bucket(configurationProvider.bucket);
  }

  get storage(): Storage {
    return this._storage;
  }

  get defaultBucket(): Bucket {
    return this._defaultBucket;
  }
}
