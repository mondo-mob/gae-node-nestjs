import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AllowAnonymous } from '../auth/auth.guard';
import * as passport from 'passport';
import { GmailConfigurer } from './gmail.configurer';
import { GmailSender } from './gmail.sender';
import { Context } from '..';
import { Ctxt } from '../datastore/context';

@Controller('system/gmail')
export class GmailController {
  constructor(
    private readonly gmailConfigurer: GmailConfigurer,
    private readonly gmailSender: GmailSender,
  ) {}

  @AllowAnonymous()
  @Get('setup')
  setupGmailOAuth(@Req() request: Request, @Res() response: Response) {
    const authenticateRet = this.gmailConfigurer.authenticate();
    authenticateRet(request, response);
  }

  @AllowAnonymous()
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

  @AllowAnonymous()
  @Get('test-send-email')
  testSendEmail(@Ctxt() context: Context) {
    const mailOptions = {
      from: 'deline@3wks.com.au',
      to: 'deline.neo@growthops.com.au',
      subject: 'this is the subject line',
      text: 'It works...blah',
      html: '<b>It works...blah</b>',
    };

    this.gmailSender.send(context, mailOptions);

    return 'testing';
  }
}
