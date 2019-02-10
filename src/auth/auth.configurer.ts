import * as Datastore from '@google-cloud/datastore';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as Logger from 'bunyan';
import { decode } from "jsonwebtoken";
import * as passport from 'passport';
import { use } from 'passport';
import { Profile, Strategy as Auth0Strategy } from 'passport-auth0';
import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as SamlStrategy } from 'passport-saml';
import { newContext } from '../datastore/context';
import { DatastoreProvider } from '../datastore/datastore.provider';
import { createLogger } from '../gcloud/logging';
import { Configuration, IUser } from '../index';
import { AuthService } from './auth.service';
import { UserService, USER_SERVICE } from './user.service';

const GOOGLE_SIGNIN = 'google-signin';
const SAML_SIGNIN = 'saml';
const AUTH0_SIGNIN = 'auth0';
const LOCAL_SIGNIN = 'local-signin';

@Injectable()
export class AuthConfigurer {
  private readonly datastore: Datastore;
  private readonly logger: Logger;

  constructor(
    datastoreProvider: DatastoreProvider,
    @Inject('Configuration') private readonly configuration: Configuration,
    @Inject(USER_SERVICE) private readonly userService: UserService<IUser>,
    private readonly authService: AuthService,
  ) {
    this.datastore = datastoreProvider.datastore;
    this.logger = createLogger('auth');
    this.init();
  }

  private init() {
    passport.serializeUser((user: IUser, done) => {
      done(null, { id: user.id });
    });

    passport.deserializeUser(async (user: { id: string }, done) => {
      done(null, { id: user.id });
    });

    if (this.configuration.auth.local) {
      use(LOCAL_SIGNIN, new LocalStrategy({ usernameField: 'username', passwordField: 'password' }, this.validate));
    }

    if (this.configuration.auth.google && this.configuration.auth.google.enabled) {
      use(
        GOOGLE_SIGNIN,
        new GoogleStrategy(
          {
            clientID: this.configuration.auth.google.clientId,
            clientSecret: this.configuration.auth.google.secret,
            callbackURL: `${this.configuration.host}/auth/signin/google/callback`,
          },
          this.validateGmail,
        ),
      );
    }

    if (this.configuration.auth.saml && this.configuration.auth.saml.enabled) {
      use(
        SAML_SIGNIN,
        new SamlStrategy(
          {
            entryPoint: this.configuration.auth.saml.identityProviderUrl,
            callbackUrl: `${this.configuration.host}/auth/signin/saml/acs`,
            issuer: this.configuration.host,
            acceptedClockSkewMs: 5000,
            cert: this.configuration.auth.saml.cert,
          },
          this.validateSaml,
        ),
      );
    }

    if (this.configuration.auth.auth0 && this.configuration.auth.auth0.enabled) {
      use(
        AUTH0_SIGNIN,
        new Auth0Strategy(
          {
            domain: this.configuration.auth.auth0.domain,
            clientID: this.configuration.auth.auth0.clientId,
            clientSecret: this.configuration.auth.auth0.secret,
            callbackURL: `${this.configuration.host}/auth/signin/auth0/callback`,
          },
          this.validateAuth0,
        ),
      );
    }
  }

  beginAuthenticateGoogle() {
    const options = {
      scope: ['profile', 'email'],
    };
    return passport.authenticate(GOOGLE_SIGNIN, options);
  }

  completeAuthenticateGoogle() {
    return passport.authenticate(GOOGLE_SIGNIN, {
      failureRedirect: '/',
    });
  }

  beginAuthenticateSaml() {
    return passport.authenticate(SAML_SIGNIN, {
      failureRedirect: '/',
    });
  }

  completeAuthenticateSaml() {
    return passport.authenticate(SAML_SIGNIN, {
      failureRedirect: '/',
    });
  }

  beginAuthenticateAuth0() {
    const options = {
      scope: ['openid', 'email'],
    };
    return passport.authenticate(AUTH0_SIGNIN, options);
  }

  completeAuthenticateAuth0() {
    return passport.authenticate(AUTH0_SIGNIN, {
      failureRedirect: '/',
    });
  }

  authenticateLocal() {
    return passport.authenticate(LOCAL_SIGNIN, {});
  }

  validate = async (username: string, password: string, done: (error: Error | null, user: IUser | false) => void) => {
    try {
      const user = await this.authService.validateUser(newContext(this.datastore), username, password);
      if (!user) {
        return done(new UnauthorizedException(), false);
      }
      done(null, user);
    } catch (ex) {
      this.logger.error(ex);
      done(new UnauthorizedException('Username or password is invalid.', ex), false);
    }
  };

  validateGmail = async (
    accessToken: string,
    refreshToken: string,
    profile: object,
    done: (error: Error | null, user: IUser | false) => void,
  ) => {
    try {
      const user = await this.authService.validateUserGoogle(newContext(this.datastore), profile);
      if (!user) {
        return done(new UnauthorizedException(), false);
      }
      done(null, user);
    } catch (ex) {
      this.logger.error(ex);
      done(new UnauthorizedException('Username is invalid.', ex), false);
    }
  };

  validateSaml = async (profile: any, done: any) => {
    try {
      const user = await this.authService.validateUserSaml(newContext(this.datastore), profile);
      if (!user) {
        return done(new UnauthorizedException(), false);
      }
      done(null, user);
    } catch (ex) {
      this.logger.error(ex);
      done(new UnauthorizedException('Username is invalid.', ex), false);
    }
  };

  validateAuth0 = async (
    accessToken: string,
    refreshToken: string,
    extraParams: any,
    profile: Profile,
    done: (error: Error | null, user: IUser | false) => void,
  ) => {
    const decoded: any = decode(extraParams.id_token);
    const { email } = decoded;
    const roles = decoded[`${this.configuration.auth.auth0!.namespace}roles`];
    const orgId = decoded[`${this.configuration.auth.auth0!.namespace}orgId`];

    if (!roles || !roles.length) {
      this.logger.warn(`No roles were provided by auth0 for ${email}`);
    }

    try {
      const user = await this.authService.validateUserAuth0(newContext(this.datastore), email, orgId, roles);
      if (!user) {
        return done(new UnauthorizedException(), false);
      }
      done(null, user);
    } catch (ex) {
      this.logger.error(ex);
      done(new UnauthorizedException('Username is invalid.', ex), false);
    }
  };
}
