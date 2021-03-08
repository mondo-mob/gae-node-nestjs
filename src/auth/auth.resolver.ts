import { Context as GqlContext, Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { CredentialRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AllowAnonymous, Roles } from './auth.guard';
import { InviteUserService } from './invite-user.service';
import { PasswordResetService } from './password-reset.service';
import { Context, IUser } from '../datastore/context';
import { AuthUser } from './auth-user.model';

@Resolver(() => AuthUser)
export class AuthResolver {
  constructor(
    private readonly credentialsRepository: CredentialRepository,
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly inviteUserService: InviteUserService,
  ) {}

  @Roles('admin')
  @ResolveField()
  async credentials(@Parent() { id }: IUser, _args: {}, @GqlContext() context: Context) {
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
  @Query(() => AuthUser, { nullable: true })
  async me(_req: void, _args: void, context: Context): Promise<AuthUser | undefined> {
    if (context.user) {
      return context.user;
    }
  }

  @AllowAnonymous()
  @Mutation(() => Boolean, { nullable: true })
  async resetPassword(_req: void, @Args('email') email: string, context: Context) {
    return await this.passwordResetService.resetPassword(context, email);
  }

  @AllowAnonymous()
  @Mutation(() => Boolean, { nullable: true })
  async confirmResetPassword(
    _req: void,
    @Args('newPassword') newPassword: string,
    @Args('code') code: string,
    context: Context,
  ) {
    return await this.passwordResetService.confirmResetPassword(context, code, newPassword);
  }

  @Roles('admin')
  @Mutation(() => String)
  async inviteUser(
    _req: void,
    @Args('roles', { type: () => [String!] }) roles: string[],
    @Args('email') email: string,
    context: Context,
  ) {
    const {
      user: { id },
    } = await this.inviteUserService.inviteUser(context, { email, roles });
    return id;
  }

  @AllowAnonymous()
  @Query(() => String, { nullable: true })
  async checkActivationCode(_req: void, @Args('code') code: string, context: Context): Promise<string | null> {
    return this.inviteUserService.checkActivationCode(context, code);
  }

  @AllowAnonymous()
  @Mutation(() => AuthUser)
  async activateAccount(
    _req: void,
    @Args('password') password: string,
    @Args('name') name: string,
    @Args('code') code: string,
    context: Context,
  ): Promise<AuthUser> {
    return this.inviteUserService.activateAccount(context, code, name, password);
  }
}
