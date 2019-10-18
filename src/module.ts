import { ForwardReference, Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { AuthConfigurer } from './auth/auth.configurer';
import { AuthController } from './auth/auth.controller';
import { AuthResolver } from './auth/auth.graphql';
import { AuthGuard } from './auth/auth.guard';
import { CredentialRepository, PasswordResetRepository, UserInviteRepository } from './auth/auth.repository';
import { AuthService } from './auth/auth.service';
import { InviteUserService } from './auth/invite-user.service';
import { LoginIdentifierRepository } from './auth/login-identifier.repository';
import { PasswordResetService } from './auth/password-reset.service';
import { Configuration } from './configuration';
import { DatastoreProvider } from './datastore/datastore.provider';
import { NotFoundFilter } from './filter';
import { StorageProvider } from './gcloud/storage.provider';
import { GraphQLMiddleware } from './graphql/GraphQLMiddleware';
import { ContextMiddleware } from './interceptor';
import { GmailConfigurer } from './mail/gmail/gmail.configurer';
import { GmailController } from './mail/gmail/gmail.controller';
import { GmailSender } from './mail/gmail/gmail.sender';
import { StoredCredentialsRepository } from './mail/gmail/stored.credentials.repository';
import { MailDiverter } from './mail/mail.diverter';
import { MailLoggingSender } from './mail/mail-logging.sender';
import { MAIL_SENDER, MailSender } from './mail/mail.sender';
import { SearchService } from './search/search.service';
import { MailWhitelistSender } from './mail/mail-whitelist.sender';
import { MailSubjectSender } from './mail/mail-subject.sender';

type ClassType = new (...args: any[]) => any;
type ClassTypeOrReference = ClassType | ForwardReference<any>;

export interface Options {
  configurationModule: ClassTypeOrReference;
  userModule: ClassTypeOrReference;
}

@Global()
@Module({
  providers: [
    StorageProvider,
    DatastoreProvider,
    CredentialRepository,
    LoginIdentifierRepository,
    PasswordResetRepository,
    UserInviteRepository,
    StoredCredentialsRepository,
    AuthService,
    AuthConfigurer,
    AuthResolver,
    PasswordResetService,
    InviteUserService,
    SearchService,
    GmailConfigurer,
    {
      provide: APP_FILTER,
      useClass: NotFoundFilter,
    },
    ContextMiddleware,
    {
      provide: MAIL_SENDER,
      useFactory: (config: Configuration, gmailConfigurer: GmailConfigurer) => {
        const disableMailLogger = !!config.devHooks && config.devHooks.disableLocalMailLogger;
        // tslint:disable-next-line
        console.log(`Configuring mail sender with devHooks: `, config.devHooks);

        let mailSender: MailSender;
        if (config.environment === 'development' && !disableMailLogger) {
          mailSender = new MailLoggingSender();
        } else {
          mailSender = new GmailSender(gmailConfigurer, config);
        }

        // When multiple settings are enabled the senders are executed
        // in reverse order to their creation
        if (config.devHooks && config.devHooks.emailWhitelist) {
          mailSender = new MailWhitelistSender(mailSender, config);
        }
        if (config.devHooks && config.devHooks.divertEmailTo) {
          mailSender = new MailDiverter(mailSender, config);
        }
        if (config.devHooks && config.devHooks.emailSubjectPrefix) {
          mailSender = new MailSubjectSender(mailSender, config);
        }
        return mailSender;
      },
      inject: ['Configuration', GmailConfigurer],
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    GraphQLMiddleware,
  ],
  exports: [
    StorageProvider,
    DatastoreProvider,
    CredentialRepository,
    LoginIdentifierRepository,
    UserInviteRepository,
    PasswordResetRepository,
    PasswordResetService,
    InviteUserService,
    MAIL_SENDER,
    SearchService,
  ],
  controllers: [AuthController, GmailController],
})
export class GCloudModule implements NestModule {
  constructor(private readonly graphqlConfigurer: GraphQLMiddleware) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes('*');
    consumer.apply(GraphQLMiddleware).forRoutes('/api/graphql');
  }

  static forConfiguration(options: Options) {
    return {
      module: GCloudModule,
      imports: [options.configurationModule, options.userModule, GraphQLModule],
    };
  }
}
