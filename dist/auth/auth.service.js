"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const t = require("io-ts");
const bcrypt = require("bcryptjs");
const emails = require("email-addresses");
const auth_repository_1 = require("./auth.repository");
const io_ts_reporters_1 = require("io-ts-reporters");
const user_service_1 = require("./user.service");
const transactional_1 = require("../datastore/transactional");
const logging_1 = require("../gcloud/logging");
const configuration_1 = require("../configuration");
const userProfile = t.interface({
    id: t.string,
    emails: t.array(t.interface({
        value: t.string,
        verified: t.boolean,
    })),
    displayName: t.string,
});
class UserNotFoundError extends common_1.HttpException {
    constructor() {
        super('UserNotFoundError', common_1.HttpStatus.FORBIDDEN);
    }
}
exports.UserNotFoundError = UserNotFoundError;
class CredentialsNotFoundError extends common_1.HttpException {
    constructor() {
        super('CredentialsNotFoundError', common_1.HttpStatus.FORBIDDEN);
    }
}
exports.CredentialsNotFoundError = CredentialsNotFoundError;
class PasswordInvalidError extends common_1.HttpException {
    constructor() {
        super('PasswordInvalidError', common_1.HttpStatus.FORBIDDEN);
    }
}
exports.PasswordInvalidError = PasswordInvalidError;
const PASSWORD_ROUNDS = 10;
async function hashPassword(password) {
    return await bcrypt.hash(password, PASSWORD_ROUNDS);
}
exports.hashPassword = hashPassword;
let AuthService = class AuthService {
    constructor(authRepository, userService, configurationProvider) {
        this.authRepository = authRepository;
        this.userService = userService;
        this.configurationProvider = configurationProvider;
        this.logger = logging_1.createLogger('account-service');
    }
    async validateUser(context, username, password) {
        const account = await this.authRepository.get(context, username);
        if (!account) {
            throw new CredentialsNotFoundError();
        }
        if (account.type !== 'password') {
            throw new CredentialsNotFoundError();
        }
        const result = await bcrypt.compare(password, account.password);
        if (!result) {
            throw new PasswordInvalidError();
        }
        const user = await this.userService.get(context, account.userId);
        if (!user) {
            throw new UserNotFoundError();
        }
        return user;
    }
    async validateUserGoogle(context, inputProfile) {
        const validationResult = userProfile.decode(inputProfile);
        if (validationResult.isLeft()) {
            throw new Error(io_ts_reporters_1.reporter(validationResult).join(', '));
        }
        const profile = validationResult.value;
        const accountEmails = profile.emails.find(accountEmail => accountEmail.verified);
        if (!accountEmails) {
            throw new CredentialsNotFoundError();
        }
        const email = accountEmails.value;
        const account = await this.authRepository.get(context, email);
        if (!account) {
            if (!this.configurationProvider.auth.google || !this.configurationProvider.auth.google.signUpEnabled) {
                throw new CredentialsNotFoundError();
            }
            const { domain } = emails.parseOneAddress(email);
            const signUpDomains = this.configurationProvider.auth.google.signUpDomains || [];
            if (!signUpDomains.includes(domain)) {
                throw new CredentialsNotFoundError();
            }
            const createdUser = await this.userService.create(context, {
                roles: this.configurationProvider.auth.google.signUpRoles,
                email,
                name: profile.displayName,
            });
            await this.authRepository.save(context, {
                id: email,
                type: 'google',
                userId: createdUser.id,
            });
            return createdUser;
        }
        if (account.type !== 'google' && account.type !== 'password') {
            throw new CredentialsNotFoundError();
        }
        const user = await this.userService.get(context, account.userId);
        if (!user) {
            throw new UserNotFoundError();
        }
        return user;
    }
    async validateUserSaml(context, profile) {
        this.logger.info('Validating SAML user profile');
        const email = profile.email;
        this.logger.info(`Looking up user by email ${email}`);
        const account = await this.authRepository.get(context, email);
        if (!account) {
            this.logger.info('No account found, creating it.');
            const createdUser = await this.userService.create(context, {
                roles: [],
                email,
                name: `${profile.firstName} ${profile.lastName}`,
            });
            await this.authRepository.save(context, {
                id: profile.email,
                type: 'saml',
                userId: createdUser.id,
            });
            return createdUser;
        }
        if (account.type !== 'saml') {
            throw new CredentialsNotFoundError();
        }
        const user = await this.userService.get(context, account.userId);
        if (!user) {
            throw new UserNotFoundError();
        }
        return user;
    }
    async validateUserAuth0(context, email, orgId, roles) {
        this.logger.info('Validating Auth0 user profile');
        this.logger.info(`Looking up user by email ${email}`);
        const account = await this.authRepository.get(context, email);
        if (!account) {
            this.logger.info('No account found, creating it.');
            const createdUser = await this.userService.create(context, {
                roles,
                orgId,
                email,
            });
            await this.authRepository.save(context, {
                id: email,
                type: 'auth0',
                userId: createdUser.id,
            });
            return createdUser;
        }
        if (account.type !== 'auth0') {
            throw new CredentialsNotFoundError();
        }
        const user = await this.userService.get(context, account.userId);
        if (!user) {
            throw new UserNotFoundError();
        }
        user.roles = roles;
        user.orgId = orgId;
        await this.userService.update(context, user.id, user);
        return user;
    }
    async createAccount(context, email, password, account) {
        const existingCredentials = await this.authRepository.get(context, email);
        if (!existingCredentials) {
            return await this.authRepository.save(context, {
                id: email,
                password: await hashPassword(password),
                userId: account,
                type: 'password',
            });
        }
        return existingCredentials;
    }
};
tslib_1.__decorate([
    transactional_1.Transactional(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthService.prototype, "validateUserGoogle", null);
tslib_1.__decorate([
    transactional_1.Transactional(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthService.prototype, "validateUserSaml", null);
tslib_1.__decorate([
    transactional_1.Transactional(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String, String, Array]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthService.prototype, "validateUserAuth0", null);
tslib_1.__decorate([
    transactional_1.Transactional(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthService.prototype, "createAccount", null);
AuthService = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(1, common_1.Inject(user_service_1.USER_SERVICE)),
    tslib_1.__param(2, common_1.Inject(configuration_1.CONFIGURATION)),
    tslib_1.__metadata("design:paramtypes", [auth_repository_1.CredentialRepository, Object, Object])
], AuthService);
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map