"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
var GCloudModule_1;
"use strict";
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const graphql_1 = require("@nestjs/graphql");
const auth_configurer_1 = require("./auth/auth.configurer");
const auth_controller_1 = require("./auth/auth.controller");
const auth_graphql_1 = require("./auth/auth.graphql");
const auth_guard_1 = require("./auth/auth.guard");
const auth_repository_1 = require("./auth/auth.repository");
const auth_service_1 = require("./auth/auth.service");
const invite_user_service_1 = require("./auth/invite-user.service");
const login_identifier_repository_1 = require("./auth/login-identifier.repository");
const password_reset_service_1 = require("./auth/password-reset.service");
const datastore_provider_1 = require("./datastore/datastore.provider");
const filter_1 = require("./filter");
const storage_provider_1 = require("./gcloud/storage.provider");
const GraphQLMiddleware_1 = require("./graphql/GraphQLMiddleware");
const interceptor_1 = require("./interceptor");
const gmail_configurer_1 = require("./mail/gmail/gmail.configurer");
const gmail_controller_1 = require("./mail/gmail/gmail.controller");
const gmail_sender_1 = require("./mail/gmail/gmail.sender");
const stored_credentials_repository_1 = require("./mail/gmail/stored.credentials.repository");
const mail_diverter_1 = require("./mail/mail.diverter");
const mail_logging_stub_1 = require("./mail/mail.logging.stub");
const mail_sender_1 = require("./mail/mail.sender");
const search_service_1 = require("./search/search.service");
let GCloudModule = GCloudModule_1 = class GCloudModule {
    constructor(graphqlConfigurer) {
        this.graphqlConfigurer = graphqlConfigurer;
    }
    configure(consumer) {
        consumer.apply(interceptor_1.ContextMiddleware).forRoutes('*');
        consumer.apply(GraphQLMiddleware_1.GraphQLMiddleware).forRoutes('/api/graphql');
    }
    static forConfiguration(options) {
        return {
            module: GCloudModule_1,
            imports: [options.configurationModule, options.userModule, graphql_1.GraphQLModule],
        };
    }
};
GCloudModule = GCloudModule_1 = tslib_1.__decorate([
    common_1.Global(),
    common_1.Module({
        providers: [
            storage_provider_1.StorageProvider,
            datastore_provider_1.DatastoreProvider,
            auth_repository_1.CredentialRepository,
            login_identifier_repository_1.LoginIdentifierRepository,
            auth_repository_1.PasswordResetRepository,
            auth_repository_1.UserInviteRepository,
            stored_credentials_repository_1.StoredCredentialsRepository,
            auth_service_1.AuthService,
            auth_configurer_1.AuthConfigurer,
            auth_graphql_1.AuthResolver,
            password_reset_service_1.PasswordResetService,
            invite_user_service_1.InviteUserService,
            search_service_1.SearchService,
            gmail_configurer_1.GmailConfigurer,
            {
                provide: core_1.APP_FILTER,
                useClass: filter_1.NotFoundFilter,
            },
            interceptor_1.ContextMiddleware,
            {
                provide: mail_sender_1.MAIL_SENDER,
                useFactory: (config, gmailConfigurer) => {
                    const disableMailLogger = !!config.devHooks && config.devHooks.disableLocalMailLogger;
                    console.log(`Configuring mail sender with devHooks: `, config.devHooks);
                    if (config.environment === 'development' && !disableMailLogger) {
                        return new mail_logging_stub_1.LoggingMailSenderStub();
                    }
                    const gmailSender = new gmail_sender_1.GmailSender(gmailConfigurer, config);
                    return (config.devHooks && config.devHooks.divertEmailTo)
                        ? new mail_diverter_1.MailDiverter(gmailSender, config)
                        : gmailSender;
                },
                inject: ['Configuration', gmail_configurer_1.GmailConfigurer],
            },
            {
                provide: core_1.APP_GUARD,
                useClass: auth_guard_1.AuthGuard,
            },
            GraphQLMiddleware_1.GraphQLMiddleware,
        ],
        exports: [
            storage_provider_1.StorageProvider,
            datastore_provider_1.DatastoreProvider,
            auth_repository_1.CredentialRepository,
            login_identifier_repository_1.LoginIdentifierRepository,
            auth_repository_1.UserInviteRepository,
            auth_repository_1.PasswordResetRepository,
            password_reset_service_1.PasswordResetService,
            invite_user_service_1.InviteUserService,
            mail_sender_1.MAIL_SENDER,
            search_service_1.SearchService,
        ],
        controllers: [auth_controller_1.AuthController, gmail_controller_1.GmailController],
    }),
    tslib_1.__metadata("design:paramtypes", [GraphQLMiddleware_1.GraphQLMiddleware])
], GCloudModule);
exports.GCloudModule = GCloudModule;
//# sourceMappingURL=module.js.map