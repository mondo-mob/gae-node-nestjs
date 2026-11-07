import { Inject, Injectable } from '@nestjs/common';
import { Configuration } from '../configuration';
import { Bucket, StorageOptions, Storage } from '@google-cloud/storage';
import { createLogger, Logger } from './logging';

@Injectable()
export class StorageProvider {
  private readonly _storage: Storage;
  private readonly _defaultBucket: Bucket;
  private readonly logger: Logger;

  constructor(@Inject('Configuration') private readonly configurationProvider: Configuration) {
    this.logger = createLogger('storage');
    const config: StorageOptions = {};
    const credentials = configurationProvider.storage?.credentials;
    if (configurationProvider.isDevelopment()) {
      if (credentials) {
        this.logger.info(
          'Application is running locally, using configured storage.credentials to connect to Google Cloud Storage',
        );
        config.credentials = StorageProvider.parseCredentials(credentials);
      } else {
        // Deprecated: prefer storage.credentials
        this.logger.info(
          'Application is running locally, using keyfile.json credentials to connect to Google Cloud Storage',
        );
        config.keyFilename = './keyfile.json';
      }
    } else if (credentials) {
      // Deployed environments always use the runtime identity (Application Default Credentials)
      this.logger.warn(
        'storage.credentials is only used for local development; ignoring it and using the runtime identity',
      );
    }
    this._storage = new Storage(config);
    this.logger.info(`Default Google Cloud Storage bucket: ${configurationProvider.bucket}`);
    this._defaultBucket = this.storage.bucket(configurationProvider.bucket);
  }

  get storage(): Storage {
    return this._storage;
  }

  get defaultBucket(): Bucket {
    return this._defaultBucket;
  }

  async getDefaultBucketResumableUploadUrl(fileId: string): Promise<string> {
    const gcsFile = this._defaultBucket.file(fileId);
    const urls = await gcsFile.createResumableUpload({
      origin: this.configurationProvider.host,
    });
    return urls[0];
  }

  private static parseCredentials(credentials: string | Record<string, unknown>): StorageOptions['credentials'] {
    if (typeof credentials !== 'string') {
      return credentials;
    }
    try {
      return JSON.parse(credentials);
    } catch {
      // Deliberately omit the parse error and the value: either could contain part of the key
      throw new Error('storage.credentials is not valid JSON');
    }
  }
}
