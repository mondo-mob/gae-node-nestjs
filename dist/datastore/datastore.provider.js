"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const datastore_1 = require("@google-cloud/datastore");
const common_1 = require("@nestjs/common");
const __1 = require("../");
let DatastoreProvider = class DatastoreProvider {
    constructor(configuration) {
        this.logger = __1.createLogger('datastore-provider');
        const { projectId, apiEndpoint } = configuration;
        if (apiEndpoint) {
            this.logger.info('API endpoint provided for datastore, connecting to local emulator.');
        }
        this.datastoreConnection = new datastore_1.Datastore({
            projectId,
            apiEndpoint,
        });
    }
    get datastore() {
        return this.datastoreConnection;
    }
};
DatastoreProvider = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(0, common_1.Inject('Configuration')),
    tslib_1.__metadata("design:paramtypes", [Object])
], DatastoreProvider);
exports.DatastoreProvider = DatastoreProvider;
//# sourceMappingURL=datastore.provider.js.map