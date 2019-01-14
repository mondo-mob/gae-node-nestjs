import {ForwardReference, Global, MiddlewareConsumer, Module, NestModule} from '@nestjs/common';
import {APP_FILTER, APP_GUARD} from '@nestjs/core';
import {GraphQLModule} from '@nestjs/graphql';
import {fileLoader, mergeTypes} from 'merge-graphql-schemas';
import {AuthConfigurer} from './auth/auth.configurer';
import {AuthController} from './auth/auth.controller';
import {AuthResolver} from './auth/auth.graphql';
import {AuthGuard} from './auth/auth.guard';
import {CredentialRepository, PasswordResetRepository, UserInviteRepository} from './auth/auth.repository';
import {AuthService} from './auth/auth.service';
import {InviteUserService} from './auth/invite-user.service';
import {LoginIdentifierRepository} from './auth/login-identifier.repository';
import {PasswordResetService} from './auth/password-reset.service';
import {Configuration} from './configuration';
import {DatastoreProvider} from './datastore/datastore.provider';
import {NotFoundFilter} from './filter';
import {StorageProvider} from './gcloud/storage.provider';
import {GmailConfigurer} from './mail/gmail/gmail.configurer';
import {GmailController} from './mail/gmail/gmail.controller';
import {GmailSender} from './mail/gmail/gmail.sender';
import {StoredCredentialsRepository} from './mail/gmail/stored.credentials.repository';
import {GraphQLMiddleware} from './graphql/GraphQLMiddleware';
import {ContextMiddleware} from './interceptor';
import {MailDiverter} from './mail/mail.diverter';
import {LocalMailLogger} from './mail/mail.local.logger';

interface ClassType { new (...args: any[]): any }
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
    GmailConfigurer,
    {
      provide: APP_FILTER,
      useClass: NotFoundFilter,
    },
    ContextMiddleware,
    {
      provide: GmailSender,
      useFactory: (
        configurationProvider: Configuration,
        gmailConfigurer: GmailConfigurer,
      ) => {
        if (configurationProvider.environment === 'development') {
          return new LocalMailLogger();
        }
        const gmailSender = new GmailSender(gmailConfigurer, configurationProvider);
        return (configurationProvider.devHooks && configurationProvider.devHooks.divertEmailTo)
          ? new MailDiverter(gmailSender, configurationProvider)
          : gmailSender;
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
    GmailSender,
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
