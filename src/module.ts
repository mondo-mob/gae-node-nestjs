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
import {PasswordResetService} from './auth/password-reset.service';
import {Configuration} from './configuration';
import {DatastoreProvider} from './datastore/datastore.provider';
import {NotFoundFilter} from './filter';
import {StorageProvider} from './gcloud/storage.provider';
import {GmailConfigurer} from './gmail/gmail.configurer';
import {GmailController} from './gmail/gmail.controller';
import {GmailSender} from './gmail/gmail.sender';
import {LocalGmailSender} from './gmail/gmail.sender.local';
import {StoredCredentialsRepository} from './gmail/stored.credentials.repository';
import {GraphQLMiddleware} from './graphql/GraphQLMiddleware';
import {ContextMiddleware} from './interceptor';

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
        return configurationProvider.environment === 'development'
          ? new LocalGmailSender()
          : new GmailSender(gmailConfigurer, configurationProvider);
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
