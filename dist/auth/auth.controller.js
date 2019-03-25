"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const auth_configurer_1 = require("./auth.configurer");
const auth_guard_1 = require("./auth.guard");
const logging_1 = require("../gcloud/logging");
const __1 = require("..");
let AuthController = class AuthController {
    constructor(authConfigurer, inviteUserService, configuration) {
        this.authConfigurer = authConfigurer;
        this.inviteUserService = inviteUserService;
        this.configuration = configuration;
        this.logger = logging_1.createLogger('auth-controller');
    }
    signIn(req, res, next) {
        this.authConfigurer.authenticateLocal()(req, res, (result) => {
            if (result) {
                if (result instanceof common_1.HttpException) {
                    return res.status(result.getStatus()).send(result.getResponse());
                }
                next(result);
            }
            else {
                res.send({
                    result: 'success',
                });
            }
        });
    }
    async activate(req, res, next, context) {
        const user = await this.inviteUserService.activateAccount(context, req.body.code, req.body.name, req.body.password);
        if (user) {
            if (this.configuration.auth.local && this.configuration.auth.local.autoLoginAfterActivate) {
                req.body.username = user.email;
                this.authConfigurer.authenticateLocal()(req, res, (result) => {
                    if (result) {
                        if (result instanceof common_1.HttpException) {
                            return res.status(result.getStatus()).send(result.getResponse());
                        }
                        next(result);
                    }
                    else {
                        res.send({
                            result: 'Activated and logged in successfully',
                        });
                    }
                });
            }
            else {
                res.send({
                    result: 'Activated successfully',
                });
            }
        }
    }
    signOut(req, res, next) {
        req.logout();
        res.redirect('/');
    }
    signInGoogle(req, res, next) {
        this.authConfigurer.beginAuthenticateGoogle()(req, res, next);
    }
    completeSignInGoogle(req, res) {
        this.authConfigurer.completeAuthenticateGoogle()(req, res, (err) => {
            if (req.user) {
                res.redirect(`/`);
            }
            else {
                this.logger.warn('Login with google failed', err);
                res.redirect(`/signin?error=${encodeURIComponent('Login with google failed.')}`);
            }
        });
    }
    signInSaml(req, res, next) {
        this.logger.info('Redirecting to SAML Identity Provider');
        this.authConfigurer.beginAuthenticateSaml()(req, res, next);
    }
    completeSignInSaml(req, res) {
        this.logger.info('Received ACS callback from SAML Identity Provider');
        this.authConfigurer.completeAuthenticateSaml()(req, res, (err) => {
            if (req.user) {
                this.logger.info('user: %o', req.user);
                res.redirect('/');
            }
            else {
                this.logger.warn('Login with SAML failed', err);
                res.redirect(`/signin?error=${encodeURIComponent('Login with SAML failed.')}`);
            }
        });
    }
    signInAuth0(req, res, next) {
        this.authConfigurer.beginAuthenticateAuth0()(req, res, next);
    }
    completeSignInAuth0(req, res) {
        this.authConfigurer.completeAuthenticateAuth0()(req, res, (err) => {
            this.logger.info(err);
            if (req.user) {
                res.redirect(`/`);
            }
            else {
                this.logger.warn('Login with auth0 failed', err);
                res.redirect(`/signin?error=${encodeURIComponent('Login with auth0 failed.')}`);
            }
        });
    }
};
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    common_1.Post('signin/local'),
    tslib_1.__param(0, common_1.Req()), tslib_1.__param(1, common_1.Res()), tslib_1.__param(2, common_1.Next()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Function]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "signIn", null);
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    common_1.Post('activate'),
    tslib_1.__param(0, common_1.Req()),
    tslib_1.__param(1, common_1.Res()),
    tslib_1.__param(2, common_1.Next()),
    tslib_1.__param(3, __1.Ctxt()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Function, Object]),
    tslib_1.__metadata("design:returntype", Promise)
], AuthController.prototype, "activate", null);
tslib_1.__decorate([
    common_1.Post('signout/local'),
    tslib_1.__param(0, common_1.Req()), tslib_1.__param(1, common_1.Res()), tslib_1.__param(2, common_1.Next()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Function]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "signOut", null);
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    common_1.Get('signin/google'),
    tslib_1.__param(0, common_1.Req()), tslib_1.__param(1, common_1.Res()), tslib_1.__param(2, common_1.Next()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Function]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "signInGoogle", null);
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    common_1.Get('signin/google/callback'),
    tslib_1.__param(0, common_1.Req()), tslib_1.__param(1, common_1.Res()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "completeSignInGoogle", null);
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    common_1.Get('signin/saml'),
    tslib_1.__param(0, common_1.Req()), tslib_1.__param(1, common_1.Res()), tslib_1.__param(2, common_1.Next()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Function]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "signInSaml", null);
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    common_1.Post('signin/saml/acs'),
    tslib_1.__param(0, common_1.Req()), tslib_1.__param(1, common_1.Res()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "completeSignInSaml", null);
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    common_1.Get('signin/auth0'),
    tslib_1.__param(0, common_1.Req()), tslib_1.__param(1, common_1.Res()), tslib_1.__param(2, common_1.Next()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object, Function]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "signInAuth0", null);
tslib_1.__decorate([
    auth_guard_1.AllowAnonymous(),
    common_1.Get('signin/auth0/callback'),
    tslib_1.__param(0, common_1.Req()), tslib_1.__param(1, common_1.Res()),
    tslib_1.__metadata("design:type", Function),
    tslib_1.__metadata("design:paramtypes", [Object, Object]),
    tslib_1.__metadata("design:returntype", void 0)
], AuthController.prototype, "completeSignInAuth0", null);
AuthController = tslib_1.__decorate([
    common_1.Controller('auth'),
    tslib_1.__param(2, common_1.Inject('Configuration')),
    tslib_1.__metadata("design:paramtypes", [auth_configurer_1.AuthConfigurer,
        __1.InviteUserService, Object])
], AuthController);
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map