import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { createLogger } from '../..';
import { Roles } from '../../auth/auth.guard';
import * as passport from 'passport';
import { GmailConfigurer } from './gmail.configurer';

@Roles('super')
@Controller('system/gmail')
export class GmailController {
  private readonly logger = createLogger('gmail-controller');

  constructor(private readonly gmailConfigurer: GmailConfigurer) {}

  @Get('setup')
  setupGmailOAuth(@Req() request: Request, @Res() response: Response) {
    const authenticateRet = this.gmailConfigurer.authenticate();
    authenticateRet(request, response, (err: any) => {
      this.logger.error(err);
    });
  }

  @Get('setup/oauth2callback')
  oauthCallback(@Req() request: Request, @Res() response: Response) {
    const authenticateRet = passport.authenticate('google-gmail', {
      failureRedirect: '/',
    });

    authenticateRet(request, response, () => {
      this.logger.info(
        `Gmail OAuth done. request.user.refreshToken property exists is: ${request.user &&
          !!request.user.refreshToken}`,
      );

      if (!request.user) {
        response.send('Gmail OAuth setup FAILED.');
      } else if (!request.user.refreshToken) {
        response.send('Gmail OAuth incomplete - credentials have not been saved.');
      } else {
        response.send('Gmail OAuth completed!');
      }
    });
  }
}
