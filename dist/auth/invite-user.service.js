"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const uuid = require("node-uuid");
const configuration_1 = require("../configuration");
const transactional_1 = require("../datastore/transactional");
const logging_1 = require("../gcloud/logging");
const index_1 = require("../index");
const mail_sender_1 = require("../mail/mail.sender");
const auth_repository_1 = require("./auth.repository");
const auth_service_1 = require("./auth.service");
const arrays_1 = require("../util/arrays");
const invite_1 = require("../mail-templates/invite");
exports.INVITE_CODE_EXPIRY = 7 * 24 * 60 * 60 * 1000;
let InviteUserService = class InviteUserService {
    constructor(authRepository, mailSender, configuration, userService, userInviteRepository) {
        this.authRepository = authRepository;
        this.mailSender = mailSender;
        this.configuration = configuration;
        this.userService = userService;
        this.userInviteRepository = userInviteRepository;
        this.logger = logging_1.createLogger('invite-user-service');
    }
    async inviteUserIfRequired(context, request) {
        return this.inviteUserInternal(context, request, false);
    }
    async inviteUser(context, request) {
        return this.inviteUserInternal(context, request, true);
    }
    async getInvitedUser(context, code) {
        const invite = await this.userInviteRepository.get(context, code);
        if (!invite) {
            return;
        }
        if (Date.now() - invite.createdAt.getTime() > exports.INVITE_CODE_EXPIRY) {
            this.logger.info(`User invite for ${invite.email} has expired. Was created ${invite.createdAt}.`);
            return;
        }
        return this.userService.get(context, invite.userId);
    }
    async inviteUserInternal(context, request, validateNew) {
        const { email, roles } = request;
        this.logger.info(`Inviting user with email: ${email}, roles: ${roles}, validateNew: ${validateNew}`);
        if (roles.includes('super')) {
            throw new Error('Cannot assign super role to users');
        }
        const auth = await this.authRepository.get(context, email);
        if (validateNew && auth) {
            throw new Error('Email already exists');
        }
        let user = await this.userService.getByEmail(context, email);
        if (!user) {
            user = await this.userService.create(context, {
                email,
                name: request.name,
                enabled: false,
            });
        }
        if (auth) {
            this.logger.info(`User with email ${email} already has a login so does not need to be invited`);
            const updatedUser = await this.userService.update(context, user.id, {
                roles: arrays_1.unique(user.roles, ...roles),
                enabled: true,
            });
            return { user: updatedUser };
        }
        else {
            const inviteId = uuid.v4();
            await this.userInviteRepository.save(context, {
                id: inviteId,
                email,
                createdAt: new Date(),
                roles,
                userId: user.id,
            });
            const activateLink = `${this.configuration.host}/activate/${inviteId}`;
            if (request.skipEmail) {
                this.logger.info('Skipping sending invitation email based on request option');
            }
            else {
                this.logger.info(`Sending invitation email to ${email} with link ${activateLink}`);
                const title = 'Activate your account';
                await this.mailSender.send(context, {
                    to: email,
                    subject: title,
                    html: invite_1.userInviteEmail(title, activateLink),
                });
            }
            return { user, inviteId, activateLink };
        }
    }
    async activateAccount(context, code, name, password) {
        const invite = await this.userInviteRepository.get(context, code);
        if (!invite) {
            throw new Error('Invalid invite code');
        }
        if (Date.now() - invite.createdAt.getTime() > exports.INVITE_CODE_EXPIRY) {
            throw new Error('Invite code has expired');
        }
        const auth = await this.authRepository.get(context, invite.email);
        if (auth) {
            throw new Error('Account already registered');
        }
        const user = await this.userService.update(context, invite.userId, {
            name,
            roles: invite.roles,
            enabled: true,
        });
        this.logger.info(`Accepting invitation and activating account for email ${user.email}, code ${code}, name ${name}`);
        await this.authRepository.save(context, {
            id: invite.email,
            type: 'password',
            password: await auth_service_1.hashPassword(password),
            userId: user.id,
        });
        await this.userInviteRepository.delete(context, code);
        return user;
    }
};
tslib_1.__decorate([
    transactional_1.Transactional(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], InviteUserService.prototype, "inviteUser", null);
tslib_1.__decorate([
    transactional_1.Transactional(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String, String, String]),
    tslib_1.__metadata("design:returntype", Promise)
], InviteUserService.prototype, "activateAccount", null);
InviteUserService = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(1, common_1.Inject(mail_sender_1.MAIL_SENDER)),
    tslib_1.__param(2, common_1.Inject(configuration_1.CONFIGURATION)),
    tslib_1.__param(3, common_1.Inject(index_1.USER_SERVICE)),
    tslib_1.__metadata("design:paramtypes", [auth_repository_1.CredentialRepository, Object, Object, Object, auth_repository_1.UserInviteRepository])
], InviteUserService);
exports.InviteUserService = InviteUserService;
//# sourceMappingURL=invite-user.service.js.map