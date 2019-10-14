import { Controller, Get, HttpException, HttpStatus, Inject, Next, Post, Req, Res } from '@nestjs/common';
import * as Logger from 'bunyan';
import { Request, Response } from 'express';
import { Configuration, Context, Ctxt, InviteUserService } from '..';
import { createLogger } from '../gcloud/logging';
import { AuthConfigurer } from './auth.configurer';
import { AllowAnonymous, Roles } from './auth.guard';
import { AuthListener, AUTH_LISTENER } from './auth.listener';

@Controller('auth')
export class AuthController {
  private logger: Logger;
  constructor(
    private readonly authConfigurer: AuthConfigurer,
    private readonly inviteUserService: InviteUserService,
    @Inject('Configuration') private readonly configuration: Configuration,
    @Inject(AUTH_LISTENER) private readonly authListener: AuthListener,
  ) {
    this.logger = createLogger('auth-controller');
  }

  @AllowAnonymous()
  @Post('signin/local')
  signIn(@Req() req: Request, @Res() res: Response, @Next() next: (err: Error) => void) {
    this.authConfigurer.authenticateLocal()(req, res, (result?: Error) => {
      if (result) {
        if (result instanceof HttpException) {
          return res.status(result.getStatus()).send(result.getResponse());
        }
        next(result);
      } else {
        this.authListener.onLogin(req);
        res.send({
          result: 'success',
        });
      }
    });
  }

  @AllowAnonymous()
  @Post('signin/fake')
  signInFake(@Req() req: Request, @Res() res: Response, @Next() next: (err: Error) => void) {
    this.authConfigurer.authenticateFake()(req, res, (result?: Error) => {
      if (result) {
        if (result instanceof HttpException) {
          return res.status(result.getStatus()).send(result.getResponse());
        }
        next(result);
      } else {
        this.authListener.onLogin(req);
        res.send({
          result: 'success',
        });
      }
    });
  }

  @AllowAnonymous()
  @Post('activate')
  async activate(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: (err: Error) => void,
    @Ctxt() context: Context,
  ) {
    await this.inviteUserService.activateAccount(context, req.body.code, req.body.name, req.body.password);
    res.send({
      result: 'Activated successfully',
    });
  }

  @Roles('admin')
  @Post('re-invite')
  async reInviteUser(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: (err: Error) => void,
    @Ctxt() context: Context,
  ) {
    if (!req.body.userId) {
      throw new Error('User id not supplied');
    }
    this.logger.info('Re invite requested for ' + req.body.userId);

    const userInviteResponse = await this.inviteUserService.reInviteForUserId(context, req.body.userId);

    if (userInviteResponse) {
      res.send({
        result: 'Re Invited user successfully',
      });
    } else {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error while re inviting user');
    }
  }

  @AllowAnonymous()
  @Get('signout/local')
  signOutLocal(@Req() req: Request, @Res() res: Response, @Next() next: (err: Error) => void) {
    this.logger.debug('Logging out local user');
    req.logout();

    if (req.xhr) {
      res.status(204).send();
    } else {
      const redirectUrl = '/';
      this.logger.debug(`Redirecting to ${redirectUrl} for non-xhr request`);
      res.redirect(redirectUrl);
    }
  }

  /**
   * @deprecated use GET /auth/signout/local instead
   */
  @Post('signout/local')
  signOut(@Req() req: Request, @Res() res: Response, @Next() next: (err: Error) => void) {
    this.logger.warn(
      'This endpoint is deprecated and will be removed in future releases - please use GET /auth/signout/local instead',
    );
    req.logout();
    res.redirect('/');
  }

  @AllowAnonymous()
  @Get('signin/google')
  signInGoogle(@Req() req: Request, @Res() res: Response, @Next() next: () => void) {
    this.authConfigurer.beginAuthenticateGoogle()(req, res, next);
  }

  @AllowAnonymous()
  @Get('signin/google/callback')
  completeSignInGoogle(@Req() req: Request, @Res() res: Response) {
    this.authConfigurer.completeAuthenticateGoogle()(req, res, (err: any) => {
      if (req.user) {
        this.authListener.onLogin(req);
        res.redirect(`/`);
      } else {
        this.logger.warn('Login with google failed', err);
        res.redirect(`/signin?error=${encodeURIComponent('Login with google failed.')}`);
      }
    });
  }

  @AllowAnonymous()
  @Get('signin/saml')
  signInSaml(@Req() req: Request, @Res() res: Response, @Next() next: () => void) {
    this.logger.info('Redirecting to SAML Identity Provider');
    this.authConfigurer.beginAuthenticateSaml()(req, res, next);
  }

  @AllowAnonymous()
  @Post('signin/saml/acs')
  completeSignInSaml(@Req() req: Request, @Res() res: Response) {
    this.logger.info('Received ACS callback from SAML Identity Provider');
    this.authConfigurer.completeAuthenticateSaml()(req, res, (err: any) => {
      if (req.user) {
        this.logger.info('user: %o', req.user);
        this.authListener.onLogin(req);
        res.redirect('/');
      } else {
        this.logger.warn('Login with SAML failed', err);
        res.redirect(`/signin?error=${encodeURIComponent('Login with SAML failed.')}`);
      }
    });
  }

  @AllowAnonymous()
  @Get('signin/auth0')
  signInAuth0(@Req() req: Request, @Res() res: Response, @Next() next: () => void) {
    this.authConfigurer.beginAuthenticateAuth0()(req, res, next);
  }

  @AllowAnonymous()
  @Get('signout/auth0')
  signOutAuth0(@Req() req: Request, @Res() res: Response) {
    const redirectUrl = this.authConfigurer.getSignoutUrlAuth0();
    this.logger.info('Redirecting to ', redirectUrl);
    res.redirect(redirectUrl);
  }

  @AllowAnonymous()
  @Get('signin/auth0/callback')
  completeSignInAuth0(@Req() req: Request, @Res() res: Response) {
    this.authConfigurer.completeAuthenticateAuth0()(req, res, (err: any) => {
      this.logger.info(err);
      if (req.user) {
        this.authListener.onLogin(req);
        res.redirect(`/`);
      } else {
        this.logger.warn('Login with auth0 failed', err);
        res.redirect(`/signin?error=${encodeURIComponent('Login with auth0 failed.')}`);
      }
    });
  }

  @AllowAnonymous()
  @Get('signin/oidc')
  signInOidc(@Req() req: Request, @Res() res: Response, @Next() next: () => void) {
    this.authConfigurer.beginAuthenticateOidc()(req, res, next);
  }

  @AllowAnonymous()
  @Get('signin/oidc/callback')
  completeSignInOidc(@Req() req: Request, @Res() res: Response) {
    this.authConfigurer.completeAuthenticateOidc()(req, res, (err: any) => {
      this.logger.info(err);
      if (req.user) {
        this.authListener.onLogin(req);
        res.redirect(`/`);
      } else {
        this.logger.warn('Login with oidc failed', err);
        res.redirect(`/signin?error=${encodeURIComponent('Login with oidc failed.')}`);
      }
    });
  }
}
