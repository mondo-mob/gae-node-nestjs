"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const graphql_1 = require("@nestjs/graphql");
const auth_repository_1 = require("./auth.repository");
const auth_service_1 = require("./auth.service");
const auth_guard_1 = require("./auth.guard");
const invite_user_service_1 = require("./invite-user.service");
const password_reset_service_1 = require("./password-reset.service");
let AuthResolver = class AuthResolver {
    constructor(credentialsRepository, authService, passwordResetService, inviteUserService) {
        this.credentialsRepository = credentialsRepository;
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.inviteUserService = inviteUserService;
    }
    async credentials({ id }, _args, context) {
        const [maybeCredentials] = await this.credentialsRepository.query(context, {
            filters: {
                userId: id,
            },
            limit: 1,
        });
        if (maybeCredentials && maybeCredentials.length > 0) {
            const credentials = maybeCredentials[0];
            return {
                username: credentials.id,
                type: credentials.type,
            };
        }
    }
    async me(_req, _args, context) {
        if (context.user) {
            return context.user;
        }
    }
    async resetPassword(_req, { email }, context) {
        return await this.passwordResetService.resetPassword(context, email);
    }
    async confirmResetPassword(_req, { code, newPassword }, context) {
        return await this.passwordResetService.confirmResetPassword(context, code, newPassword);
    }
    async inviteUser(_req, { email, roles }, context) {
        const { user: { id }, } = await this.inviteUserService.inviteUser(context, { email, roles });
        return id;
    }
    async activateAccount(_req, { code, name, password }, context) {
        await this.inviteUserService.activateAccount(context, code, name, password);
    }
};
tslib_1.__decorate([
    auth_guard_1.Roles('admin'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthResolver.prototype, "credentials", null);
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    graphql_1.Query('me'),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [void 0, void 0, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthResolver.prototype, "me", null);
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    graphql_1.Mutation(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [void 0, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthResolver.prototype, "resetPassword", null);
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    graphql_1.Mutation(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [void 0, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthResolver.prototype, "confirmResetPassword", null);
tslib_1.__decorate([
    auth_guard_1.Roles('admin'),
    graphql_1.Mutation(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [void 0, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthResolver.prototype, "inviteUser", null);
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    graphql_1.Mutation(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [void 0, Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthResolver.prototype, "activateAccount", null);
AuthResolver = tslib_1.__decorate([
    graphql_1.Resolver('User'),
    tslib_1.__metadata("design:paramtypes", [auth_repository_1.CredentialRepository,
        auth_service_1.AuthService,
        password_reset_service_1.PasswordResetService,
        invite_user_service_1.InviteUserService])
], AuthResolver);
exports.AuthResolver = AuthResolver;
//# sourceMappingURL=auth.graphql.js.map