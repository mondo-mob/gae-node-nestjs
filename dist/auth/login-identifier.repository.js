"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const t = require("io-ts");
const repository_1 = require("../datastore/repository");
const datastore_provider_1 = require("../datastore/datastore.provider");
const loginIdentifier = t.interface({
    id: t.string,
    userId: t.string,
    createdAt: repository_1.dateType,
});
let LoginIdentifierRepository = class LoginIdentifierRepository extends repository_1.Repository {
    constructor(datastore) {
        super(datastore.datastore, 'LoginIdentifier', loginIdentifier, {
            index: {
                userId: true,
            },
        });
    }
};
LoginIdentifierRepository = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__metadata("design:paramtypes", [datastore_provider_1.DatastoreProvider])
], LoginIdentifierRepository);
exports.LoginIdentifierRepository = LoginIdentifierRepository;
//# sourceMappingURL=login-identifier.repository.js.map