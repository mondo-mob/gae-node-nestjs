import { forwardRef, Inject, Module, ForwardReference } from "@nestjs/common";
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
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "./auth/auth.guard";
import { USER_SERVICE } from "./auth/user.service";
import { Configuration } from "./configuration";
import { StoredCredentialsRepository } from "./gmail/stored.credentials.repository";
export { Repository, dateType } from "./datastore/repository";
export { Transactional } from "./datastore/transactional";
export { DatastoreProvider } from "./datastore/datastore.provider";
export { createLogger, rootLogger, BunyanLogger } from "./gcloud/logging";
export { StorageProvider } from "./gcloud/storage.provider";
export {
  Context,
  isContext,
  newContext,
  IUser,
  Ctxt
} from "./datastore/context";
export { TaskQueue } from "./gcloud/tasks";
export { Filters, Filter } from "./datastore/loader";
export { CsrfValidator } from "./auth/csrf.interceptor";
export {
  AuthGuard,
  Task,
  System,
  Cron,
  AllowAnonymous,
  Roles
} from "./auth/auth.guard";
export * from "./auth/user.service";
export { GmailSender } from "./gmail/gmail.sender";
export {
  PasswordResetRepository,
  UserInviteRepository,
  CredentialRepository
} from "./auth/auth.repository";
export { PasswordResetService } from "./auth/password-reset.service";
export { InviteUserService } from "./auth/invite-user.service";
export { AuthService } from "./auth/auth.service";
export { UserService } from "./auth/user.service";
export { Configuration, CONFIGURATION } from "./configuration";

type ClassType = { new (...args: any[]): any };
type ClassTypeOrReference = ClassType | ForwardReference<any>;

export interface Options {
  configurationModule: ClassTypeOrReference;
}

export function module(options: Options): ForwardReference<{ new (): {} }> {
  class GCloudModule {}

  Module({
    imports: [options.configurationModule],
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
      },
      {
        provide: USER_SERVICE,
        useFactory: () => ({})
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
  })(GCloudModule);

  return forwardRef(() => GCloudModule);
}
