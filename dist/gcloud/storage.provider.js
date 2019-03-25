"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const storage_1 = require("@google-cloud/storage");
const logging_1 = require("./logging");
let StorageProvider = class StorageProvider {
    constructor(configurationProvider) {
        this.configurationProvider = configurationProvider;
        this.logger = logging_1.createLogger('storage');
        const config = {};
        if (configurationProvider.isDevelopment()) {
            this.logger.info('Application is running locally, using keyfile.json credentials to connect to Google Cloud Storage');
            config.keyFilename = './keyfile.json';
        }
        this._storage = new storage_1.Storage(config);
        this.logger.info(`Default Google Cloud Storage bucket: ${configurationProvider.bucket}`);
        this._defaultBucket = this.storage.bucket(configurationProvider.bucket);
    }
    get storage() {
        return this._storage;
    }
    get defaultBucket() {
        return this._defaultBucket;
    }
    async getDefaultBucketResumableUploadUrl(fileId) {
        const gcsFile = this._defaultBucket.file(fileId);
        const urls = await gcsFile.createResumableUpload({
            origin: this.configurationProvider.host,
        });
        return urls[0];
    }
};
StorageProvider = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(0, common_1.Inject('Configuration')),
    tslib_1.__metadata("design:paramtypes", [Object])
], StorageProvider);
exports.StorageProvider = StorageProvider;
//# sourceMappingURL=storage.provider.js.map