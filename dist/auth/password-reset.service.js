"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const uuid = require("node-uuid");
const transactional_1 = require("../datastore/transactional");
const logging_1 = require("../gcloud/logging");
const index_1 = require("../index");
const auth_repository_1 = require("./auth.repository");
const auth_service_1 = require("./auth.service");
const DEFAULT_PASSWORD_TOKEN_EXPIRY = 24 * 60 * 60 * 1000;
let PasswordResetService = class PasswordResetService {
    constructor(authRepository, passwordResetRepository, configuration, mailSender) {
        this.authRepository = authRepository;
        this.passwordResetRepository = passwordResetRepository;
        this.configuration = configuration;
        this.mailSender = mailSender;
        this.logger = logging_1.createLogger('password-reset-service');
        this.tokenExpiry = configuration.passwordTokenExpiry || DEFAULT_PASSWORD_TOKEN_EXPIRY;
    }
    async resetPassword(context, email) {
        const credentials = await this.authRepository.get(context, email);
        if (!credentials) {
            this.logger.info(`No account found when trying to reset password for "${email}"`);
            return;
        }
        if (credentials.type !== 'password') {
            this.logger.info(`No account found when trying to reset password for "${email}"`);
            return;
        }
        this.logger.info(`Sending password reset email for "${email}"`);
        const id = uuid.v4();
        await this.passwordResetRepository.save(context, {
            accountId: credentials.id,
            createdAt: new Date(),
            id,
        });
        const address = `${this.configuration.host}/confirm-reset/${id}`;
        await this.mailSender.send(context, {
            to: email,
            subject: 'Password reset',
            html: `
        <html>
        <head></head>
        <body><a href="${address}">Reset your password</a></body>
        </html>
      `,
        });
    }
    async confirmResetPassword(context, code, newPassword) {
        const resetToken = await this.passwordResetRepository.get(context, code);
        if (!resetToken) {
            throw new Error('Invalid password reset token');
        }
        if (Date.now() - resetToken.createdAt.getTime() > this.tokenExpiry) {
            throw new Error('Token has expired');
        }
        const account = await this.authRepository.get(context, resetToken.accountId);
        if (!account) {
            throw new Error('Account no longer exists');
        }
        if (account.type !== 'password') {
            throw new Error('Account no longer exists');
        }
        account.password = await auth_service_1.hashPassword(newPassword);
        this.logger.info(`Resetting password for account ${resetToken.id}`);
        await this.passwordResetRepository.delete(context, resetToken.id);
        await this.authRepository.save(context, account);
    }
};
tslib_1.__decorate([
    transactional_1.Transactional(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String]),
    tslib_1.__metadata("design:returntype", Promise)
], PasswordResetService.prototype, "resetPassword", null);
tslib_1.__decorate([
    transactional_1.Transactional(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], PasswordResetService.prototype, "confirmResetPassword", null);
PasswordResetService = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(2, common_1.Inject('Configuration')),
    tslib_1.__param(3, common_1.Inject(index_1.MAIL_SENDER)),
    tslib_1.__metadata("design:paramtypes", [auth_repository_1.CredentialRepository,
        auth_repository_1.PasswordResetRepository, Object, Object])
], PasswordResetService);
exports.PasswordResetService = PasswordResetService;
//# sourceMappingURL=password-reset.service.js.map