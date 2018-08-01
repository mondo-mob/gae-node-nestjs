import {
  forwardRef,
  Module,
  ForwardReference,
  NestModule,
  MiddlewareConsumer,
  Global
} from "@nestjs/common";
import { StorageProvider } from "./gcloud/storage.provider";
import { DatastoreProvider } from "./datastore/datastore.provider";
import {
  CredentialRepository,
  PasswordResetRepository,
  UserInviteRepository
} from "./auth/auth.repository";
import { AuthService } from "./auth/auth.service";
import { AuthConfigurer } from "./auth/auth.configurer";
import { AuthResolver } from "./auth/auth.graphql";
import { PasswordResetService } from "./auth/password-reset.service";
import { InviteUserService } from "./auth/invite-user.service";
import { AuthController } from "./auth/auth.controller";
import { GmailController } from "./gmail/gmail.controller";
import { GmailConfigurer } from "./gmail/gmail.configurer";
import { GmailSender } from "./gmail/gmail.sender";
import { LocalGmailSender } from "./gmail/gmail.sender.local";
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AuthGuard } from "./auth/auth.guard";
import { Configuration } from "./configuration";
import { StoredCredentialsRepository } from "./gmail/stored.credentials.repository";
import { ContextMiddleware } from "./interceptor";
import { NotFoundFilter } from "./filter";

type ClassType = { new (...args: any[]): any };
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
      useClass: NotFoundFilter
    },
    ContextMiddleware,
    {
      provide: GmailSender,
      useFactory: (
        configurationProvider: Configuration,
        gmailConfigurer: GmailConfigurer
      ) => {
        return configurationProvider.environment === "development"
          ? new LocalGmailSender()
          : new GmailSender(gmailConfigurer, configurationProvider);
      },
      inject: ["Configuration", GmailConfigurer]
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    }
  ],
  exports: [
    StorageProvider,
    DatastoreProvider,
    CredentialRepository,
    UserInviteRepository,
    PasswordResetRepository,
    PasswordResetService,
    InviteUserService,
    GmailSender
  ],
  controllers: [AuthController, GmailController]
})
export class GCloudModule implements NestModule {
  constructor() {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ContextMiddleware).forRoutes("*");
  }

  static forConfiguration(options: Options) {
    return {
      module: GCloudModule,
      imports: [options.configurationModule, options.userModule]
    };
  }
}
