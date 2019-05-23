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
  /**
   * If a name is supplied, it is saved only when creating a new user
   */
  name?: string;
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

    const activationExpiry = this.getActivationExpiryInMillis();

    if (Date.now() - invite.createdAt.getTime() > activationExpiry) {
      this.logger.info(`User invite for ${invite.email} has expired. Was created ${invite.createdAt}.`);
      throw new Error('Account activation expired');
    }

    return this.userService.get(context, invite.userId);
  }

  /**
   * Re invite user for the given user id. if the user invite is found for the supplied user id, error will be thrown
   * @param context
   * @param userId
   */
  async reInviteForUserId(context: Context, userId: string): Promise<IInviteUserResponse> {
    this.logger.info(`Re Inviting user with id: ${userId}`);

    // Find the existing invite record from the User Id
    const existingInvite = await this.getUserInviteForUserId(context, userId);

    if (existingInvite) {
      return this.reInviteUser(context, existingInvite);
    } else {
      throw new Error('No user invites found.');
    }
  }

  /**
   * Get User invite for the given user id. if no record found, return undefined.
   * @param {Context} context
   * @param {string} userId
   * @returns {Promise<any>}
   */
  async getUserInviteForUserId(context: Context, userId: string) {
    const [existingInvites] = await this.userInviteRepository.query(context, {
      filters: {
        userId,
      },
      limit: 1,
    });

    this.logger.info(`Existing Invites ${existingInvites}`);
    // If the existing invite record found, create a new invite, delete the old invite and send the activation email.
    if (existingInvites && existingInvites.length > 0) {
      return existingInvites[0];
    } else {
      return undefined;
    }
  }

  /**
   * Re invite user for the given current invite. Use the user id in the current invite to create a new invite.
   * If the user doesn't exists, return error
   * It will also delete the current invite and send an email with new invite.
   * @param {Context} context
   * @param existingInvite
   * @returns {Promise<IInviteUserResponse>}
   */
  @Transactional()
  protected async reInviteUser(context: Context, existingInvite: any): Promise<IInviteUserResponse> {
    const user = await this.userService.getByEmail(context, existingInvite.email);
    if (!user) {
      throw new Error('User not found');
    }

    const newInvite = await this.userInviteRepository.save(context, {
      id: uuid.v4(),
      email: existingInvite.email,
      createdAt: new Date(),
      roles: existingInvite.roles,
      userId: existingInvite.userId,
    });

    await this.userInviteRepository.delete(context, existingInvite.id);

    const activateLink = await this.sendActivationEmail(context, newInvite.email, newInvite.id, false);

    return { user, inviteId: newInvite.id, activateLink };
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
        name: request.name,
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
      const userInvite = await this.userInviteRepository.save(context, {
        id: inviteId,
        email,
        createdAt: new Date(),
        roles,
        userId: user.id,
      });

      const activateLink = await this.sendActivationEmail(context, email, inviteId, request.skipEmail);

      return { user, inviteId, activateLink };
    }
  }

  /**
   * Get the activation expiry duration in millis.
   * If there is no config data found, will use the default (7 days).
   * @returns {number}
   */
  private getActivationExpiryInMillis = () => {
    return this.configuration.auth.activationExpiryInMinutes
      ? this.configuration.auth.activationExpiryInMinutes * 60 * 1000
      : INVITE_CODE_EXPIRY;
  };

  /**
   * Send activation email and return activation link.
   * If skipEmail flag is set, just send activation link only.
   * @param {Context} context
   * @param {string} email
   * @param {string} inviteId
   * @param {boolean | undefined} skipEmail
   * @returns {Promise<string>}
   */
  private async sendActivationEmail(
    context: Context,
    email: string,
    inviteId: string,
    skipEmail: boolean | undefined,
  ): Promise<string> {
    const activateLink = `${this.configuration.host}/activate/${inviteId}`;
    if (skipEmail) {
      this.logger.info('Skipping sending invitation email based on request option');
      return activateLink;
    }

    this.logger.info(`Sending invitation email to ${email} with link ${activateLink}`);
    const title = 'Activate your account';
    await this.mailSender.send(context, {
      to: email,
      subject: title,
      html: userInviteEmail(title, activateLink),
    });
    return activateLink;
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

    const activationExpiry = this.getActivationExpiryInMillis();

    if (Date.now() - invite.createdAt.getTime() > activationExpiry) {
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
