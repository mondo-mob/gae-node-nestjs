"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const t = require("io-ts");
const repository_1 = require("../../datastore/repository");
const datastore_provider_1 = require("../../datastore/datastore.provider");
const storedCredential = t.interface({
    id: t.string,
    value: t.string,
});
let StoredCredentialsRepository = class StoredCredentialsRepository extends repository_1.Repository {
    constructor(datastore) {
        super(datastore.datastore, 'StoredCredential', storedCredential, {});
    }
};
StoredCredentialsRepository = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__metadata("design:paramtypes", [datastore_provider_1.DatastoreProvider])
], StoredCredentialsRepository);
exports.StoredCredentialsRepository = StoredCredentialsRepository;
//# sourceMappingURL=stored.credentials.repository.js.map