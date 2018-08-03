import { Injectable, Inject } from "@nestjs/common";
import * as Logger from "bunyan";
import * as uuid from "node-uuid";
import { GmailSender } from "../gmail/gmail.sender";
import { CredentialRepository, UserInviteRepository } from "./auth.repository";
import { hashPassword } from "./auth.service";
import { Transactional } from "../datastore/transactional";
import { createLogger } from "../gcloud/logging";
import {Context, IUser} from "../datastore/context";
import {Configuration, USER_SERVICE, UserService} from "../index";
import { CONFIGURATION } from "../configuration";

export const INVITE_CODE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class InviteUserService {
  private readonly logger: Logger;

  constructor(
    private readonly authRepository: CredentialRepository,
    private readonly gmailSender: GmailSender,
    @Inject(CONFIGURATION) private readonly configuration: Configuration,
    @Inject(USER_SERVICE) private readonly userService: UserService<IUser>,
    private readonly userInviteRepository: UserInviteRepository
  ) {
    this.logger = createLogger("invite-user-service");
  }

  /**
   * Create a user invite and dispatch an invite email
   *
   * Invite expires after {@link INVITE_CODE_EXPIRY} ms
   *
   * @param context Request context
   * @param email The recipient
   * @param roles The roles for this account
   */
  @Transactional()
  async inviteUser(context: Context, email: string, roles: string[]) {
    const auth = await this.authRepository.get(context, email);

    if (auth) {
      throw new Error("Email already exists");
    }

    if (roles.includes("super")) {
      throw new Error("Cannot assign super role to users");
    }

    const id = uuid.v4();

    await this.userInviteRepository.save(context, {
      id,
      email,
      createdAt: new Date(),
      roles
    });

    const address = `${this.configuration.host}/activate/${id}`;

    await this.gmailSender.send(context, {
      to: email,
      subject: "Activate account",
      html: `
        <html>
        <head></head>
        <body><a href="${address}">Activate your account</a></body>
        </html>
      `
    });
  }

  /**
   * Activate an account given an activation code, name and password
   *
   * @param context
   * @param code
   * @param name
   * @param password
   */
  @Transactional()
  async activateAccount(
    context: Context,
    code: string,
    name: string,
    password: string
  ) {
    const invite = await this.userInviteRepository.get(context, code);

    if (!invite) {
      throw new Error("Invalid invite code");
    }

    if (Date.now() - invite.createdAt.getTime() > INVITE_CODE_EXPIRY) {
      throw new Error("Invite code has expired");
    }

    const auth = await this.authRepository.get(context, invite.email);

    if (auth) {
      throw new Error("Account already registered");
    }

    const id = uuid.v4();
    await this.authRepository.save(context, {
      id: invite.email,
      type: "password",
      password: await hashPassword(password),
      userId: id
    });

    await this.userService.create(context, {
      id,
      name,
      email: invite.email,
      roles: invite.roles
    });

    await this.userInviteRepository.delete(context, code);
  }
}
