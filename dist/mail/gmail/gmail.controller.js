"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const __1 = require("../..");
const auth_guard_1 = require("../../auth/auth.guard");
const passport = require("passport");
const gmail_configurer_1 = require("./gmail.configurer");
let GmailController = class GmailController {
    constructor(gmailConfigurer) {
        this.gmailConfigurer = gmailConfigurer;
        this.logger = __1.createLogger('gmail-controller');
    }
    setupGmailOAuth(request, response) {
        const authenticateRet = this.gmailConfigurer.authenticate();
        authenticateRet(request, response, (err) => {
            this.logger.error(err);
        });
    }
    oauthCallback(request, response) {
        const authenticateRet = passport.authenticate('google-gmail', {
            failureRedirect: '/',
        });
        authenticateRet(request, response, () => {
            this.logger.info(`Gmail OAuth done. request.user.refreshToken property exists is: ${request.user && !!request.user.refreshToken}`);
            if (!request.user) {
                response.send('Gmail OAuth setup FAILED.');
            }
            else if (!request.user.refreshToken) {
                response.send('Gmail OAuth incomplete - credentials have not been saved.');
            }
            else {
                response.send('Gmail OAuth completed!');
            }
        });
    }
};
tslib_1.__decorate([
    common_1.Get('setup'),
    tslib_1.__param(0, common_1.Req()), tslib_1.__param(1, common_1.Res()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], GmailController.prototype, "setupGmailOAuth", null);
tslib_1.__decorate([
    common_1.Get('setup/oauth2callback'),
    tslib_1.__param(0, common_1.Req()), tslib_1.__param(1, common_1.Res()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], GmailController.prototype, "oauthCallback", null);
GmailController = tslib_1.__decorate([
    auth_guard_1.Roles('super'),
    common_1.Controller('system/gmail'),
    tslib_1.__metadata("design:paramtypes", [gmail_configurer_1.GmailConfigurer])
], GmailController);
exports.GmailController = GmailController;
//# sourceMappingURL=gmail.controller.js.map