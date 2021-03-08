import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AllowAnonymous, Roles } from './auth.guard';
import { InviteUserService } from './invite-user.service';
import { PasswordResetService } from './password-reset.service';
import { Context } from '../datastore/context';

@Resolver()
export class AuthResolver {
  constructor(
    private readonly passwordResetService: PasswordResetService,
    private readonly inviteUserService: InviteUserService,
  ) {}

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
  @Mutation(() => Boolean, { nullable: true })
  async activateAccount(
    _req: void,
    @Args('password') password: string,
    @Args('name') name: string,
    @Args('code') code: string,
    context: Context,
  ) {
    await this.inviteUserService.activateAccount(context, code, name, password);
  }
}
