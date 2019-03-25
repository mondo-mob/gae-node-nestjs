"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const _ = require("lodash");
const context_1 = require("./datastore/context");
const datastore_provider_1 = require("./datastore/datastore.provider");
const user_service_1 = require("./auth/user.service");
const logging_1 = require("./gcloud/logging");
let ContextMiddleware = class ContextMiddleware {
    constructor(datastoreProvider, userService) {
        this.datastoreProvider = datastoreProvider;
        this.userService = userService;
        this.logger = logging_1.createLogger('context-middleware');
    }
    resolve(...args) {
        return async (req, res, next) => {
            this.logger.info(`[${req.method}]: ${req.originalUrl}`);
            const requestContext = context_1.newContext(this.datastoreProvider.datastore);
            const userId = _.get(req, 'session.passport.user.id');
            if (userId && !req.is('text/html')) {
                requestContext.user = await this.userService.get(requestContext, userId);
            }
            req.context = requestContext;
            if (next) {
                next();
            }
        };
    }
};
ContextMiddleware = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(1, common_1.Inject(user_service_1.USER_SERVICE)),
    tslib_1.__metadata("design:paramtypes", [datastore_provider_1.DatastoreProvider, Object])
], ContextMiddleware);
exports.ContextMiddleware = ContextMiddleware;
//# sourceMappingURL=interceptor.js.map