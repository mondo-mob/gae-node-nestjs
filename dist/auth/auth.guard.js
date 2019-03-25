"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const common_2 = require("@nestjs/common");
const logging_1 = require("../gcloud/logging");
const context_1 = require("../datastore/context");
const configuration_1 = require("../configuration");
const logger = logging_1.createLogger('auth-guard');
exports.Roles = (...roles) => common_2.ReflectMetadata('roles', roles);
exports.AllowAnonymous = () => common_2.ReflectMetadata('allowAnonymous', true);
exports.Task = () => common_2.ReflectMetadata('secure-header', 'x-appengine-taskname');
exports.Cron = () => common_2.ReflectMetadata('secure-header', 'x-appengine-cron');
exports.System = () => common_2.ReflectMetadata('system', true);
const reflectValue = (reflector, key, context, defaultValue) => {
    const methodValue = reflector.get(key, context.getHandler());
    if (methodValue !== undefined) {
        return methodValue;
    }
    const classValue = reflector.get(key, context.getClass());
    if (classValue !== undefined) {
        return classValue;
    }
    return defaultValue;
};
function isAllowAnonymous(reflector, context) {
    return reflectValue(reflector, 'allowAnonymous', context, false);
}
function isUserAllowedAccess(reflector, context, user) {
    if (!user) {
        return false;
    }
    const roles = reflectValue(reflector, 'roles', context, []);
    if (!roles.length) {
        return true;
    }
    const { roles: userRoles = [] } = user;
    const allowed = roles.some(role => userRoles.includes(role));
    if (!allowed) {
        logger.warn('User does not have the required role');
    }
    return allowed;
}
function isSystemCall(reflector, context) {
    return reflectValue(reflector, 'system', context, false);
}
async function isAuthorizedSystemCall(reflector, context, secret) {
    const { verify } = await Promise.resolve().then(() => require('jsonwebtoken'));
    const { headers } = context.switchToHttp().getRequest();
    if (!headers.authorization) {
        return false;
    }
    const token = headers.authorization.substr(4);
    return new Promise(resolve => verify(token, secret, {
        maxAge: '5 min',
        algorithms: ['HS256'],
    }, err => {
        if (err) {
            logger.error('Error decoding system token', err);
            resolve(false);
        }
        else {
            resolve(true);
        }
    }));
}
function hasSecureHeader(reflector, context) {
    const { headers } = context
        .switchToHttp()
        .getRequest();
    if (!headers) {
        return false;
    }
    const secureHeader = reflectValue(reflector, 'secure-header', context, undefined);
    if (secureHeader) {
        return !!headers[secureHeader];
    }
    return false;
}
function getUser(context) {
    const request = context
        .switchToHttp()
        .getRequest();
    if (request.context && request.context.user) {
        return request.context.user;
    }
    else {
        const args = context.getArgs();
        if (args.length > 2) {
            const ctxt = args[2];
            if (context_1.isContext(ctxt)) {
                return ctxt.user;
            }
        }
    }
    return undefined;
}
let AuthGuard = class AuthGuard {
    constructor(reflector, configurationProvider) {
        this.reflector = reflector;
        this.configurationProvider = configurationProvider;
        this.logger = logging_1.createLogger('auth-guard');
    }
    canActivate(context) {
        if (isAllowAnonymous(this.reflector, context)) {
            return true;
        }
        if (isSystemCall(this.reflector, context)) {
            return isAuthorizedSystemCall(this.reflector, context, this.configurationProvider.systemSecret);
        }
        if (hasSecureHeader(this.reflector, context)) {
            return true;
        }
        const user = getUser(context);
        return isUserAllowedAccess(this.reflector, context, user);
    }
};
AuthGuard = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(1, common_1.Inject(configuration_1.CONFIGURATION)),
    tslib_1.__metadata("design:paramtypes", [core_1.Reflector, Object])
], AuthGuard);
exports.AuthGuard = AuthGuard;
//# sourceMappingURL=auth.guard.js.map