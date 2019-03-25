"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const jsonwebtoken_1 = require("jsonwebtoken");
const passport = require("passport");
const passport_1 = require("passport");
const passport_auth0_1 = require("passport-auth0");
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_local_1 = require("passport-local");
const passport_saml_1 = require("passport-saml");
const context_1 = require("../datastore/context");
const datastore_provider_1 = require("../datastore/datastore.provider");
const logging_1 = require("../gcloud/logging");
const auth_service_1 = require("./auth.service");
const user_service_1 = require("./user.service");
const GOOGLE_SIGNIN = 'google';
const SAML_SIGNIN = 'saml';
const AUTH0_SIGNIN = 'auth0';
const LOCAL_SIGNIN = 'local-signin';
let AuthConfigurer = class AuthConfigurer {
    constructor(datastoreProvider, configuration, userService, authService) {
        this.configuration = configuration;
        this.userService = userService;
        this.authService = authService;
        this.validate = async (username, password, done) => {
            try {
                const user = await this.authService.validateUser(context_1.newContext(this.datastore), username, password);
                if (!user) {
                    return done(new common_1.UnauthorizedException(), false);
                }
                done(null, user);
            }
            catch (ex) {
                this.logger.error(ex);
                done(new common_1.UnauthorizedException('Username or password is invalid.', ex), false);
            }
        };
        this.validateGmail = async (accessToken, refreshToken, profile, done) => {
            try {
                const user = await this.authService.validateUserGoogle(context_1.newContext(this.datastore), profile);
                if (!user) {
                    return done(new common_1.UnauthorizedException(), false);
                }
                done(null, user);
            }
            catch (ex) {
                this.logger.error(ex);
                done(new common_1.UnauthorizedException('Username is invalid.', ex), false);
            }
        };
        this.validateSaml = async (profile, done) => {
            try {
                const user = await this.authService.validateUserSaml(context_1.newContext(this.datastore), profile);
                if (!user) {
                    return done(new common_1.UnauthorizedException(), false);
                }
                done(null, user);
            }
            catch (ex) {
                this.logger.error(ex);
                done(new common_1.UnauthorizedException('Username is invalid.', ex), false);
            }
        };
        this.validateAuth0 = async (accessToken, refreshToken, extraParams, profile, done) => {
            const decoded = jsonwebtoken_1.decode(extraParams.id_token);
            const { email } = decoded;
            const roles = decoded[`${this.configuration.auth.auth0.namespace}roles`];
            const orgId = decoded[`${this.configuration.auth.auth0.namespace}orgId`];
            if (!roles || !roles.length) {
                this.logger.warn(`No roles were provided by auth0 for ${email}`);
            }
            try {
                const user = await this.authService.validateUserAuth0(context_1.newContext(this.datastore), email, orgId, roles);
                if (!user) {
                    return done(new common_1.UnauthorizedException(), false);
                }
                done(null, user);
            }
            catch (ex) {
                this.logger.error(ex);
                done(new common_1.UnauthorizedException('Username is invalid.', ex), false);
            }
        };
        this.datastore = datastoreProvider.datastore;
        this.logger = logging_1.createLogger('auth');
        this.init();
    }
    init() {
        passport.serializeUser((user, done) => {
            done(null, { id: user.id });
        });
        passport.deserializeUser(async (user, done) => {
            done(null, { id: user.id });
        });
        if (this.configuration.auth.local) {
            passport_1.use(LOCAL_SIGNIN, new passport_local_1.Strategy({ usernameField: 'username', passwordField: 'password' }, this.validate));
        }
        if (this.configuration.auth.google && this.configuration.auth.google.enabled) {
            passport_1.use(new passport_google_oauth20_1.Strategy({
                clientID: this.configuration.auth.google.clientId,
                clientSecret: this.configuration.auth.google.secret,
                callbackURL: `${this.configuration.host}/auth/signin/google/callback`,
                userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
            }, this.validateGmail));
        }
        if (this.configuration.auth.saml && this.configuration.auth.saml.enabled) {
            passport_1.use(SAML_SIGNIN, new passport_saml_1.Strategy({
                entryPoint: this.configuration.auth.saml.identityProviderUrl,
                callbackUrl: `${this.configuration.host}/auth/signin/saml/acs`,
                issuer: this.configuration.host,
                acceptedClockSkewMs: 5000,
                cert: this.configuration.auth.saml.cert,
            }, this.validateSaml));
        }
        if (this.configuration.auth.auth0 && this.configuration.auth.auth0.enabled) {
            passport_1.use(AUTH0_SIGNIN, new passport_auth0_1.Strategy({
                domain: this.configuration.auth.auth0.domain,
                clientID: this.configuration.auth.auth0.clientId,
                clientSecret: this.configuration.auth.auth0.secret,
                callbackURL: `${this.configuration.host}/auth/signin/auth0/callback`,
            }, this.validateAuth0));
        }
    }
    beginAuthenticateGoogle() {
        const options = {
            scope: ['profile', 'email'],
        };
        return passport.authenticate(GOOGLE_SIGNIN, options);
    }
    completeAuthenticateGoogle() {
        return passport.authenticate(GOOGLE_SIGNIN, {
            failureRedirect: '/',
        });
    }
    beginAuthenticateSaml() {
        return passport.authenticate(SAML_SIGNIN, {
            failureRedirect: '/',
        });
    }
    completeAuthenticateSaml() {
        return passport.authenticate(SAML_SIGNIN, {
            failureRedirect: '/',
        });
    }
    beginAuthenticateAuth0() {
        const options = {
            scope: ['openid', 'email'],
        };
        return passport.authenticate(AUTH0_SIGNIN, options);
    }
    completeAuthenticateAuth0() {
        return passport.authenticate(AUTH0_SIGNIN, {
            failureRedirect: '/',
        });
    }
    authenticateLocal() {
        return passport.authenticate(LOCAL_SIGNIN, {});
    }
};
AuthConfigurer = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(1, common_1.Inject('Configuration')),
    tslib_1.__param(2, common_1.Inject(user_service_1.USER_SERVICE)),
    tslib_1.__metadata("design:paramtypes", [datastore_provider_1.DatastoreProvider, Object, Object, auth_service_1.AuthService])
], AuthConfigurer);
exports.AuthConfigurer = AuthConfigurer;
//# sourceMappingURL=auth.configurer.js.map