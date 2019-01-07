import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Roles } from '../auth/auth.guard';
import * as passport from 'passport';
import { GmailConfigurer } from './gmail.configurer';

@Roles('super')
@Controller('system/gmail')
export class GmailController {
  constructor(
    private readonly gmailConfigurer: GmailConfigurer,
  ) {}

  @Get('setup')
  setupGmailOAuth(@Req() request: Request, @Res() response: Response) {
    const authenticateRet = this.gmailConfigurer.authenticate();
    authenticateRet(request, response);
  }

  @Get('setup/oauth2callback')
  oauthCallback(@Req() request: Request, @Res() response: Response) {
    const authenticateRet = passport.authenticate('google-gmail', {
      failureRedirect: '/',
    });

    authenticateRet(request, response, () => {
      if (request.user) {
        response.send('Gmail OAuth completed!');
      } else {
        response.send('Gmail OAuth setup FAILED.');
      }
    });
  }
}
