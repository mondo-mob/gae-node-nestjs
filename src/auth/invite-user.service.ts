import { Inject, Injectable } from '@nestjs/common';
import * as Logger from 'bunyan';
import * as uuid from 'node-uuid';
import { CONFIGURATION } from '../configuration';
import { Context, IUser } from '../datastore/context';
import { Transactional } from '../datastore/transactional';
import { createLogger } from '../gcloud/logging';
import { Configuration, MailSender, USER_SERVICE, UserService } from '../index';
import { MAIL_SENDER } from '../mail/mail.sender';
import { CredentialRepository, UserInviteRepository } from './auth.repository';
import { hashPassword } from './auth.service';
import { unique } from '../util/arrays';
import { userInviteEmail } from '../mail-templates/invite';

export const INVITE_CODE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

export interface IInviteUserResponse {
  user: IUser;
  inviteId?: string;
  activateLink?: string;
}

export interface IInviteUserRequest {
  email: string;
  roles: string[];
  skipEmail?: boolean;
}

@Injectable()
export class InviteUserService {
  private readonly logger: Logger;

  constructor(
    private readonly authRepository: CredentialRepository,
    @Inject(MAIL_SENDER) private readonly mailSender: MailSender,
    @Inject(CONFIGURATION) private readonly configuration: Configuration,
    @Inject(USER_SERVICE) private readonly userService: UserService<IUser>,
    private readonly userInviteRepository: UserInviteRepository,
  ) {
    this.logger = createLogger('invite-user-service');
  }

  async inviteUserIfRequired(context: Context, request: IInviteUserRequest) {
    return this.inviteUserInternal(context, request, false);
  }

  /**
   * Create a user invite and dispatch an invite email
   *
   * Invite expires after {@link INVITE_CODE_EXPIRY} ms
   *
   * @param context Request context
   * @param request Request details
   */
  @Transactional()
  async inviteUser(context: Context, request: IInviteUserRequest) {
    return this.inviteUserInternal(context, request, true);
  }

  async getInvitedUser(context: Context, code: string) {
    const invite = await this.userInviteRepository.get(context, code);
    if (!invite) {
      return;
    }

    if (Date.now() - invite.createdAt.getTime() > INVITE_CODE_EXPIRY) {
      this.logger.info(`User invite for ${invite.email} has expired. Was created ${invite.createdAt}.`);
      return;
    }

    return this.userService.get(context, invite.userId);
  }

  protected async inviteUserInternal(
    context: Context,
    request: IInviteUserRequest,
    validateNew: boolean,
  ): Promise<IInviteUserResponse> {
    const { email, roles } = request;

    this.logger.info(`Inviting user with email: ${email}, roles: ${roles}, validateNew: ${validateNew}`);

    if (roles.includes('super')) {
      throw new Error('Cannot assign super role to users');
    }

    const auth = await this.authRepository.get(context, email);

    if (validateNew && auth) {
      throw new Error('Email already exists');
    }

    let user = await this.userService.getByEmail(context, email);
    if (!user) {
      user = await this.userService.create(context, {
        email,
        enabled: false,
      });
    }

    if (auth) {
      this.logger.info(`User with email ${email} already has a login so does not need to be invited`);
      const updatedUser = await this.userService.update(context, user.id, {
        roles: unique(user.roles, ...roles),
        enabled: true,
      });
      return { user: updatedUser };
    } else {
      const inviteId = uuid.v4();
      await this.userInviteRepository.save(context, {
        id: inviteId,
        email,
        createdAt: new Date(),
        roles,
        userId: user.id,
      });

      const activateLink = `${this.configuration.host}/activate/${inviteId}`;

      if (request.skipEmail) {
        this.logger.info('Skipping sending invitation email based on request option');
      } else {
        this.logger.info(`Sending invitation email to ${email} with link ${activateLink}`);
        const title = 'Activate your account';
        await this.mailSender.send(context, {
          to: email,
          subject: title,
          html: userInviteEmail(title, activateLink),
        });
      }

      return { user, inviteId, activateLink };
    }
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
  async activateAccount(context: Context, code: string, name: string, password: string) {
    const invite = await this.userInviteRepository.get(context, code);
    if (!invite) {
      throw new Error('Invalid invite code');
    }

    if (Date.now() - invite.createdAt.getTime() > INVITE_CODE_EXPIRY) {
      throw new Error('Invite code has expired');
    }

    const auth = await this.authRepository.get(context, invite.email);

    if (auth) {
      throw new Error('Account already registered');
    }

    const user = await this.userService.update(context, invite.userId, {
      name,
      roles: invite.roles,
      enabled: true,
    });

    this.logger.info(`Accepting invitation and activating account for email ${user.email}, code ${code}, name ${name}`);

    await this.authRepository.save(context, {
      id: invite.email,
      type: 'password',
      password: await hashPassword(password),
      userId: user.id,
    });

    await this.userInviteRepository.delete(context, code);

    return user;
  }
}
