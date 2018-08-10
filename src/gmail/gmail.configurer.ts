import {Inject, Injectable} from '@nestjs/common';
import * as passport from 'passport';
import {Configuration, Context} from '..';
import {accountHolderEmail, decodeUserProfile} from '../auth/auth.service';
import {CONFIGURATION} from '../configuration';
import {newContext} from '../datastore/context';
import {DatastoreProvider} from '../datastore/datastore.provider';
import {StoredCredentialsRepository} from './stored.credentials.repository';

@Injectable()
export class GmailConfigurer {
  constructor(
    private readonly storedCredentialsRepository: StoredCredentialsRepository,
    private readonly datastoreProvider: DatastoreProvider,
    @Inject(CONFIGURATION) private readonly configuration: Configuration,
  ) {
    if (this.configuration.auth.google && this.configuration.auth.google.enabled) {
      passport.use(
        'google-gmail',
        new (require('passport-google-oauth20')).Strategy(
          {
            clientID: this.configuration.auth.google.clientId,
            clientSecret: this.configuration.auth.google.secret,
            callbackURL: `${
              this.configuration.host
              }/system/gmail/setup/oauth2callback`,
          },
          (
            accessToken: string,
            refreshToken: string,
            profileInput: any,
            done: Function,
          ) => {
            const profile = decodeUserProfile(profileInput);
            const gmailAccount = accountHolderEmail(profile);
            storedCredentialsRepository.save(
              newContext(this.datastoreProvider.datastore),
              [
                {id: 'gmail-credential', value: refreshToken, account: gmailAccount},
              ],
            );

            return done(null, {
              refreshToken,
            });
          },
        ),
      );
    }
  }

  authenticate() {
    const options = {
      scope: [
        'https://www.googleapis.com/auth/plus.me',
        'https://mail.google.com/',
      ],
      prompt: 'consent',
      accessType: 'offline',
    };
    return passport.authenticate('google-gmail', options);
  }

  getCredential(context: Context) {
    return this.storedCredentialsRepository.get(context, 'gmail-credential');
  }
}
