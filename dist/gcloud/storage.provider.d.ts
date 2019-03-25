import { Configuration } from '../index';
import { Bucket, Storage } from '@google-cloud/storage';
export declare class StorageProvider {
    private readonly configurationProvider;
    private readonly _storage;
    private readonly _defaultBucket;
    private readonly logger;
    constructor(configurationProvider: Configuration);
    readonly storage: Storage;
    readonly defaultBucket: Bucket;
    getDefaultBucketResumableUploadUrl(fileId: string): Promise<string>;
}
