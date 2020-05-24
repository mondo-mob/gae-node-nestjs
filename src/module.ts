import { DynamicModule, ForwardReference, Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { ContextMiddleware, ContextRequestScopeInterceptor } from './context';
import { GmailConfigurer } from './mail/gmail/gmail.configurer';
import { GmailController } from './mail/gmail/gmail.controller';
import { GmailSender } from './mail/gmail/gmail.sender';
import { StoredCredentialsRepository } from './mail/gmail/stored.credentials.repository';
import { MailDiverter } from './mail/mail.diverter';
import { MailLoggingSender } from './mail/mail-logging.sender';
import { MAIL_SENDER, MailSender } from './mail/mail.sender';
import { GraphQLDateTime, GraphQLTime } from 'graphql-iso-date';
import * as _ from 'lodash';
import { MailWhitelistSender } from './mail/mail-whitelist.sender';
import { MailSubjectSender } from './mail/mail-subject.sender';
import { REQUEST_SCOPE_INTERCEPTORS, RequestScopeMiddleware } from './request-scope/request-scope.middleware';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { LoggingRequestScopeInterceptor } from './logging/logging-request-scope';
import { RequestScopeInterceptor } from './request-scope';

type ModuleImport = Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference;

export interface Options {
  configurationModule: ModuleImport;
  userModule: ModuleImport;
  searchModule?: ModuleImport;
  requestScopeInterceptors?: Type<RequestScopeInterceptor>[];
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
    GmailConfigurer,
    {
      provide: APP_FILTER,
      useClass: NotFoundFilter,
    },
    ContextMiddleware,
    RequestScopeMiddleware,
    ContextRequestScopeInterceptor,
    LoggingRequestScopeInterceptor,
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
  ],
  controllers: [AuthController, GmailController],
})
export class GCloudModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware, RequestScopeMiddleware).forRoutes('*');
  }

  static forConfiguration(options: Options): DynamicModule {
    return {
      module: GCloudModule,
      imports: [
        options.configurationModule,
        options.userModule,
        ...(options.searchModule ? [options.searchModule] : []),
        GraphQLModule.forRoot({
          path: '/api/graphql',
          context: (props: any) => _.get(props.req, 'context'),
          typePaths: ['./src/**/*.graphqls', './node_modules/@mondomob/gae-node-nestjs/dist/**/*.graphqls'],
          resolvers: {
            Time: GraphQLTime,
            DateAndTime: GraphQLDateTime,
          },
        }),
      ],
      providers: [
        {
          provide: REQUEST_SCOPE_INTERCEPTORS,
          useFactory: (...interceptors: RequestScopeInterceptor[]) => interceptors,
          inject: [
            ContextRequestScopeInterceptor,
            LoggingRequestScopeInterceptor,
            ...(options.requestScopeInterceptors || []),
          ],
        },
      ],
    };
  }
}
