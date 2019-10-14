import { Inject, Injectable } from '@nestjs/common';
import * as passport from 'passport';
import { StoredCredentialsRepository } from './stored.credentials.repository';
import { Configuration, Context, createLogger } from '../..';
import { DatastoreProvider } from '../../datastore/datastore.provider';
import { newContext } from '../../datastore/context';
import { CONFIGURATION } from '../../configuration';

// tslint:disable-next-line
const GoogleStrategy = require('passport-google-oauth20').Strategy;

@Injectable()
export class GmailConfigurer {
  private readonly logger = createLogger('gmail-configurer');

  constructor(
    private readonly storedCredentialsRepository: StoredCredentialsRepository,
    private readonly datastoreProvider: DatastoreProvider,
    @Inject(CONFIGURATION) private readonly configuration: Configuration,
  ) {
    if (this.configuration.auth.google && this.configuration.auth.google.enabled) {
      passport.use(
        'google-gmail',
        new GoogleStrategy(
          {
            clientID: this.configuration.auth.google.clientId,
            clientSecret: this.configuration.auth.google.secret,
            callbackURL: `${this.configuration.host}/system/gmail/setup/oauth2callback`,
            userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
          },
          // tslint:disable-next-line:ban-types
          (accessToken: string, refreshToken: string, profile: object, done: Function) => {
            this.logger.info(`Gmail OAuth complete. Saving credentials.`);
            storedCredentialsRepository
              .save(newContext(this.datastoreProvider.datastore), {
                id: 'gmail-credential',
                value: refreshToken,
              })
              .then(() => {
                this.logger.info(`Gmail OAuth complete and credentials have been saved.`);
                return done(null, { refreshToken });
              })
              .catch(err => done(err, { refreshToken }));
          },
        ),
      );
    }
  }

  authenticate() {
    const options = {
      scope: ['https://mail.google.com/', 'openid profile'],
      prompt: 'consent',
      accessType: 'offline',
    };
    return passport.authenticate('google-gmail', options);
  }

  getCredential(context: Context) {
    return this.storedCredentialsRepository.get(context, 'gmail-credential');
  }
}
