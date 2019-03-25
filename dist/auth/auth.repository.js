"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const t = require("io-ts");
const repository_1 = require("../datastore/repository");
const datastore_provider_1 = require("../datastore/datastore.provider");
const passwordReset = t.interface({
    id: t.string,
    accountId: t.string,
    createdAt: repository_1.dateType,
});
let PasswordResetRepository = class PasswordResetRepository extends repository_1.Repository {
    constructor(datastoreProvider) {
        super(datastoreProvider.datastore, 'PasswordReset', passwordReset, {});
    }
};
PasswordResetRepository = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__metadata("design:paramtypes", [datastore_provider_1.DatastoreProvider])
], PasswordResetRepository);
exports.PasswordResetRepository = PasswordResetRepository;
const userInvite = t.interface({
    id: t.string,
    email: t.string,
    createdAt: repository_1.dateType,
    userId: t.string,
    roles: t.array(t.string),
});
let UserInviteRepository = class UserInviteRepository extends repository_1.Repository {
    constructor(datastoreProvider) {
        super(datastoreProvider.datastore, 'UserInvite', userInvite);
    }
};
UserInviteRepository = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__metadata("design:paramtypes", [datastore_provider_1.DatastoreProvider])
], UserInviteRepository);
exports.UserInviteRepository = UserInviteRepository;
const loginCredentials = t.clean(t.union([
    t.interface({
        id: t.string,
        userId: t.string,
        password: t.string,
        type: t.literal('password'),
    }),
    t.interface({
        id: t.string,
        userId: t.string,
        type: t.literal('google'),
    }),
    t.interface({
        id: t.string,
        userId: t.string,
        type: t.literal('saml'),
    }),
    t.interface({
        id: t.string,
        userId: t.string,
        type: t.literal('auth0'),
    }),
]));
let CredentialRepository = class CredentialRepository extends repository_1.Repository {
    constructor(datastore) {
        super(datastore.datastore, 'LoginCredential', loginCredentials, {
            defaultValues: { type: 'password' },
            index: {
                userId: true,
            },
        });
    }
};
CredentialRepository = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__metadata("design:paramtypes", [datastore_provider_1.DatastoreProvider])
], CredentialRepository);
exports.CredentialRepository = CredentialRepository;
//# sourceMappingURL=auth.repository.js.map