import { Controller, Get, Next, Post, Req, Res, HttpException } from '@nestjs/common';
import * as Logger from 'bunyan';
import { AuthConfigurer } from './auth.configurer';
import { AllowAnonymous } from './auth.guard';
import { Request, Response } from 'express';
import { createLogger } from '../gcloud/logging';

@Controller('auth')
export class AuthController {
  private logger: Logger;
  constructor(private readonly authConfigurer: AuthConfigurer) {
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
        res.send({
          result: 'success',
        });
      }
    });
  }

  @Post('signout/local')
  signOut(@Req() req: Request, @Res() res: Response, @Next() next: (err: Error) => void) {
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
  @Get('signin/auth0/callback')
  completeSignInAuth0(@Req() req: Request, @Res() res: Response) {
    this.authConfigurer.completeAuthenticateAuth0()(req, res, (err: any) => {
      this.logger.info(err);
      if (req.user) {
        res.redirect(`/`);
      } else {
        this.logger.warn('Login with auth0 failed', err);
        res.redirect(`/signin?error=${encodeURIComponent('Login with auth0 failed.')}`);
      }
    });
  }
}
