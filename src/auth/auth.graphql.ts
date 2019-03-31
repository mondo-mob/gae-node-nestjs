import { Resolver, Query, Mutation } from '@nestjs/graphql';
import { CredentialRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AllowAnonymous, Roles } from './auth.guard';
import { InviteUserService } from './invite-user.service';
import { PasswordResetService } from './password-reset.service';
import { Context, IUser, getCurrentContext } from '..';

@Resolver('User')
export class AuthResolver {
  constructor(
    private readonly credentialsRepository: CredentialRepository,
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly inviteUserService: InviteUserService,
  ) {}

  @Roles('admin')
  async credentials({ id }: IUser, _args: {}) {
    const [maybeCredentials] = await this.credentialsRepository.query(getCurrentContext(), {
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
  async me(_req: void, _args: void) {
    const context: Context<IUser> = getCurrentContext();
    if (context && context.user) {
      return context.user;
    }
  }

  @AllowAnonymous()
  @Mutation()
  async resetPassword(_req: void, { email }: { email: string }) {
    return await this.passwordResetService.resetPassword(getCurrentContext(), email);
  }

  @AllowAnonymous()
  @Mutation()
  async confirmResetPassword(_req: void, { code, newPassword }: { code: string; newPassword: string }) {
    return await this.passwordResetService.confirmResetPassword(getCurrentContext(), code, newPassword);
  }

  @Roles('admin')
  @Mutation()
  async inviteUser(_req: void, { email, roles }: { email: string; roles: string[] }) {
    const {
      user: { id },
    } = await this.inviteUserService.inviteUser(getCurrentContext(), { email, roles });
    return id;
  }

  @AllowAnonymous()
  @Mutation()
  async activateAccount(_req: void, { code, name, password }: { code: string; name: string; password: string }) {
    await this.inviteUserService.activateAccount(getCurrentContext(), code, name, password);
  }
}
