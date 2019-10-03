import { Resolver, Query, Mutation } from '@nestjs/graphql';
import { CredentialRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AllowAnonymous, Roles } from './auth.guard';
import { InviteUserService } from './invite-user.service';
import { PasswordResetService } from './password-reset.service';
import { Context, IUser } from '..';

@Resolver('User')
export class AuthResolver {
  constructor(
    private readonly credentialsRepository: CredentialRepository,
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly inviteUserService: InviteUserService,
  ) {}

  @Roles('admin')
  async credentials({ id }: IUser, _args: {}, context: Context) {
    const [maybeCredentials] = await this.credentialsRepository.query(context, {
      filters: {
        userId: id,
      },
      limit: 1,
    });

    if (maybeCredentials && maybeCredentials.length > 0) {
      const credentials = maybeCredentials[0];
      return {
        username: credentials.id,
        type: credentials.type,
      };
    }
  }

  @AllowAnonymous()
  @Query('me')
  async me(_req: void, _args: void, context: Context<IUser>) {
    if (context.user) {
      return context.user;
    }
  }

  @AllowAnonymous()
  @Mutation()
  async resetPassword(_req: void, { email }: { email: string }, context: Context) {
    return await this.passwordResetService.resetPassword(context, email);
  }

  @AllowAnonymous()
  @Mutation()
  async confirmResetPassword(
    _req: void,
    { code, newPassword }: { code: string; newPassword: string },
    context: Context,
  ) {
    return await this.passwordResetService.confirmResetPassword(context, code, newPassword);
  }

  @Roles('admin')
  @Mutation()
  async inviteUser(_req: void, { email, roles }: { email: string; roles: string[] }, context: Context) {
    const {
      user: { id },
    } = await this.inviteUserService.inviteUser(context, { email, roles });
    return id;
  }

  @AllowAnonymous()
  @Query('checkActivationCode')
  async checkActivationCode(_req: void, { code }: { code: string }, context: Context): Promise<string | null> {
    return this.inviteUserService.checkActivationCode(context, code);
  }

  @AllowAnonymous()
  @Mutation()
  async activateAccount(
    _req: void,
    { code, name, password }: { code: string; name: string; password: string },
    context: Context,
  ) {
    await this.inviteUserService.activateAccount(context, code, name, password);
  }
}
