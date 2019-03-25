"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const passport = require("passport");
const stored_credentials_repository_1 = require("./stored.credentials.repository");
const __1 = require("../..");
const datastore_provider_1 = require("../../datastore/datastore.provider");
const context_1 = require("../../datastore/context");
const configuration_1 = require("../../configuration");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
let GmailConfigurer = class GmailConfigurer {
    constructor(storedCredentialsRepository, datastoreProvider, configuration) {
        this.storedCredentialsRepository = storedCredentialsRepository;
        this.datastoreProvider = datastoreProvider;
        this.configuration = configuration;
        this.logger = __1.createLogger('gmail-configurer');
        if (this.configuration.auth.google && this.configuration.auth.google.enabled) {
            passport.use('google-gmail', new GoogleStrategy({
                clientID: this.configuration.auth.google.clientId,
                clientSecret: this.configuration.auth.google.secret,
                callbackURL: `${this.configuration.host}/system/gmail/setup/oauth2callback`,
                userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
            }, (accessToken, refreshToken, profile, done) => {
                this.logger.info(`Gmail OAuth complete. Saving credentials.`);
                storedCredentialsRepository.save(context_1.newContext(this.datastoreProvider.datastore), {
                    id: 'gmail-credential',
                    value: refreshToken,
                }).then(() => {
                    this.logger.info(`Gmail OAuth complete and credentials have been saved.`);
                    return done(null, { refreshToken });
                }).catch(err => done(err, { refreshToken }));
            }));
        }
    }
    authenticate() {
        const options = {
            scope: [
                'https://mail.google.com/',
                'openid profile',
            ],
            prompt: 'consent',
            accessType: 'offline',
        };
        return passport.authenticate('google-gmail', options);
    }
    getCredential(context) {
        return this.storedCredentialsRepository.get(context, 'gmail-credential');
    }
};
GmailConfigurer = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(2, common_1.Inject(configuration_1.CONFIGURATION)),
    tslib_1.__metadata("design:paramtypes", [stored_credentials_repository_1.StoredCredentialsRepository,
        datastore_provider_1.DatastoreProvider, Object])
], GmailConfigurer);
exports.GmailConfigurer = GmailConfigurer;
//# sourceMappingURL=gmail.configurer.js.map