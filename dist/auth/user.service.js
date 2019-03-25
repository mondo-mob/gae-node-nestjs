"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __1 = require("..");
exports.USER_SERVICE = 'UserService';
class AbstractUserService {
    constructor(loginIdentifierRepository) {
        this.loginIdentifierRepository = loginIdentifierRepository;
    }
    async getByEmail(context, email) {
        const loginIdentifier = await this.loginIdentifierRepository.get(context, email.toLowerCase());
        return loginIdentifier && this.get(context, loginIdentifier.userId);
    }
    async create(context, user) {
        const normalisedEmail = user.email.toLowerCase();
        await this.validateEmailAddressAvailable(context, normalisedEmail);
        const createdUser = await this.createUser(context, Object.assign({}, user, { email: normalisedEmail, roles: user.roles || [] }));
        await this.createLoginIdentifier(context, normalisedEmail, createdUser.id);
        return createdUser;
    }
    async update(context, id, updates) {
        const user = await this.get(context, id);
        if (!user) {
            throw new Error(`No user exists with id: ${id}`);
        }
        const normalisedEmail = updates.email && updates.email.toLowerCase();
        if (normalisedEmail && normalisedEmail !== user.email) {
            await this.validateEmailAddressAvailable(context, normalisedEmail);
            await Promise.all([
                this.loginIdentifierRepository.delete(context, user.email),
                this.createLoginIdentifier(context, normalisedEmail, user.id),
            ]);
        }
        const userUpdates = (normalisedEmail && Object.assign({}, updates, { email: normalisedEmail })) || updates;
        return this.updateUser(context, user, userUpdates);
    }
    async createLoginIdentifier(context, email, userId) {
        return this.loginIdentifierRepository.save(context, {
            id: email,
            createdAt: new Date(),
            userId,
        });
    }
    async validateEmailAddressAvailable(context, email) {
        const existing = await this.loginIdentifierRepository.get(context, email);
        if (existing) {
            throw new Error(`Email address already exists: ${email}`);
        }
    }
}
tslib_1.__decorate([
    __1.Transactional(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AbstractUserService.prototype, "create", null);
tslib_1.__decorate([
    __1.Transactional(),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, String, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AbstractUserService.prototype, "update", null);
exports.AbstractUserService = AbstractUserService;
//# sourceMappingURL=user.service.js.map