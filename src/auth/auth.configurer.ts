import { Datastore } from '@google-cloud/datastore';
import { Inject, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { Strategy as SamlStrategy } from '@node-saml/passport-saml';
import { Request } from 'express';
import { decode } from 'jsonwebtoken';
import { get } from 'lodash';
import * as passport from 'passport';
import { Profile, Strategy as Auth0Strategy } from 'passport-auth0';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { IVerifyOptions, Strategy as LocalStrategy } from 'passport-local';
import { Strategy as OidcStrategy } from 'passport-openidconnect';
import { Configuration } from '../configuration';
import { IUser, newContext } from '../datastore/context';
import { DatastoreProvider } from '../datastore/datastore.provider';
import { createLogger, Logger } from '../logging';
import { AUTH_CALLBACKS, AuthCallbacks } from './auth.callbacks';
import { AuthenticationFailedException, AuthService } from './auth.service';
import { normaliseEmail } from './user.service';

const GOOGLE_SIGNIN = 'google';
const SAML_SIGNIN = 'saml';
const AUTH0_SIGNIN = 'auth0';
const OIDC_SIGNIN = 'oidc';
const LOCAL_SIGNIN = 'local-signin';
const FAKE_SIGNIN = 'fake-signin';

const DEFAULT_FAILURE_REDIRECT = '/';

@Injectable()
export class AuthConfigurer {
  private readonly datastore: Datastore;
  private readonly logger: Logger;

  constructor(
    datastoreProvider: DatastoreProvider,
    @Inject('Configuration') private readonly configuration: Configuration,
    private readonly authService: AuthService,
    @Optional() @Inject(AUTH_CALLBACKS) private readonly authCallbacks: AuthCallbacks,
  ) {
    this.datastore = datastoreProvider.datastore;
    this.logger = createLogger('auth');
    this.init();
  }

  private init() {
    passport.serializeUser((user, done) => {
      done(null, { id: (user as { id: string }).id });
    });

    passport.deserializeUser(async (user: { id: string }, done) => {
      done(null, { id: user.id });
    });

    if (this.configuration.auth.local && this.configuration.auth.local.enabled) {
      passport.use(LOCAL_SIGNIN, new LocalStrategy({}, this.validate));
    }

    if (this.configuration.auth.fake && this.configuration.auth.fake.enabled) {
      if (!this.configuration.isDevelopment()) {
        if (!this.configuration.auth.fake.secret) {
          throw new Error('Fake login must have secret configured in non-development environments');
        }
        this.logger.warn('Fake login is enabled');
      }
      passport.use(FAKE_SIGNIN, new LocalStrategy({ passReqToCallback: true }, this.validateFakeLogin));
    }

    if (this.configuration.auth.google && this.configuration.auth.google.enabled) {
      passport.use(
        new GoogleStrategy(
          {
            clientID: this.configuration.auth.google.clientId,
            clientSecret: this.configuration.auth.google.secret,
            callbackURL: `${this.configuration.host}/auth/signin/google/callback`,
            userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
          },
          this.validateGmail,
        ),
      );
    }

    if (this.configuration.auth.saml && this.configuration.auth.saml.enabled) {
      passport.use(
        SAML_SIGNIN,
        new SamlStrategy(
          {
            entryPoint: this.configuration.auth.saml.identityProviderUrl,
            callbackUrl: `${this.configuration.host}/auth/signin/saml/acs`,
            issuer: this.configuration.host,
            audience: this.configuration.host,
            acceptedClockSkewMs: 5000,
            cert: this.configuration.auth.saml.cert,
            wantAuthnResponseSigned: false,
          },
          this.validateSaml,
          () => undefined,
        ),
      );
    }

    if (this.configuration.auth.auth0 && this.configuration.auth.auth0.enabled) {
      passport.use(
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

    if (this.configuration.auth.oidc && this.configuration.auth.oidc.enabled) {
      const { authUrl, clientId, enabled, issuer, secret, tokenUrl, userInfoUrl } = this.configuration.auth.oidc;
      passport.use(
        OIDC_SIGNIN,
        new OidcStrategy(
          {
            issuer,
            authorizationURL: authUrl,
            tokenURL: tokenUrl,
            userInfoURL: userInfoUrl,
            clientID: clientId,
            clientSecret: secret,
            callbackURL: `${this.configuration.host}/auth/signin/oidc/callback`,
            scope: 'profile email',
          },
          this.validateOidc,
        ),
      );
      this.logger.info(`Configured ${OIDC_SIGNIN} authentication strategy`);
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
      failureRedirect: this.configuration.auth.google!.failureRedirect || DEFAULT_FAILURE_REDIRECT,
    });
  }

  beginAuthenticateSaml() {
    return passport.authenticate(SAML_SIGNIN, {
      failureRedirect: this.configuration.auth.saml!.failureRedirect || DEFAULT_FAILURE_REDIRECT,
    });
  }

  completeAuthenticateSaml() {
    return passport.authenticate(SAML_SIGNIN, {
      failureRedirect: this.configuration.auth.saml!.failureRedirect || DEFAULT_FAILURE_REDIRECT,
    });
  }

  beginAuthenticateOidc() {
    return passport.authenticate(OIDC_SIGNIN, {
      scope: ['openid', 'profile', 'email'],
    });
  }

  completeAuthenticateOidc() {
    return passport.authenticate(OIDC_SIGNIN, {
      failureRedirect: this.configuration.auth.oidc!.failureRedirect || DEFAULT_FAILURE_REDIRECT,
    });
  }

  beginAuthenticateAuth0(req: Request) {
    const defaultOptions = {
      scope: ['openid', 'email', 'profile'],
    };
    let options: any;
    if (this.authCallbacks && this.authCallbacks.buildAuthenticationOptions) {
      options = this.authCallbacks.buildAuthenticationOptions(AUTH0_SIGNIN, req, defaultOptions);
    }
    return passport.authenticate(AUTH0_SIGNIN, options || defaultOptions);
  }

  completeAuthenticateAuth0(req: Request) {
    const defaultOptions = {
      failureRedirect: this.configuration.auth.auth0!.failureRedirect || DEFAULT_FAILURE_REDIRECT,
    };
    let options: any;
    if (this.authCallbacks && this.authCallbacks.buildAuthenticationOptions) {
      options = this.authCallbacks.buildAuthenticationOptions(AUTH0_SIGNIN, req, defaultOptions);
    }
    return passport.authenticate(AUTH0_SIGNIN, options || defaultOptions);
  }

  getSignoutUrlAuth0() {
    const clientId = this.configuration.auth.auth0!.clientId;
    const domain = this.configuration.auth.auth0!.domain;
    const host = this.configuration.host;
    return `https://${domain}/v2/logout?client_id=${clientId}&returnTo=${host}`;
  }

  authenticateLocal() {
    return passport.authenticate(LOCAL_SIGNIN, {});
  }

  authenticateFake() {
    return passport.authenticate(FAKE_SIGNIN, {});
  }

  validate = async (username: string, password: string, done: (error: Error | null, user: IUser | false) => void) =>
    this.validateAuth(done, () => this.authService.validateUser(newContext(this.datastore), username, password));

  validateFakeLogin = async (
    req: Request,
    username: string,
    password: string,
    done: (error: Error | null, user: IUser | false) => void,
  ) =>
    this.validateAuth(done, () =>
      this.authService.validateFakeLogin(
        newContext(this.datastore),
        req.headers['x-fake-secret'],
        username,
        get(req, 'body.name', ''),
        get(req, 'body.roles', []),
        get(req, 'body.orgId', ''),
        get(req, 'body.props', {}),
      ),
    );

  validateGmail = async (
    accessToken: string,
    refreshToken: string,
    profile: object,
    done: (error: Error | null, user: IUser | false) => void,
  ) => this.validateAuth(done, () => this.authService.validateUserGoogle(newContext(this.datastore), profile));

  validateSaml = (profile: any, done: any) =>
    this.validateAuth(done, () => this.authService.validateUserSaml(newContext(this.datastore), profile));

  validateOidc = (
    _issuer: any,
    _sub: any,
    profile: any,
    _accessToken: any,
    _refreshToken: any,
    done: (error: Error | null, user: IUser | false) => void,
  ) =>
    this.validateAuth(done, () =>
      this.authService.validateUserOidc(
        newContext(this.datastore),
        profile,
        !!this.configuration.auth.oidc!.replaceAuth,
        this.configuration.auth.oidc!.newUserRoles,
      ),
    );

  validateAuth0 = (
    accessToken: string,
    refreshToken: string,
    extraParams: any,
    profile: Profile,
    done: (error: Error | null, user: IUser | false) => void,
  ) =>
    this.validateAuth(done, () => {
      const decoded: any = decode(extraParams.id_token);
      const { email, name } = decoded;
      const normalisedEmail = normaliseEmail(email);
      const namespace = this.configuration.auth.auth0!.namespace;
      const roles = decoded[`${namespace}roles`];
      const orgId = decoded[`${namespace}orgId`];

      let id = normalisedEmail;
      if (this.authCallbacks && this.authCallbacks.getLoginIdentifier) {
        id = this.authCallbacks.getLoginIdentifier(AUTH0_SIGNIN, decoded);
      }

      let props = decoded[`${namespace}props`];
      if (this.authCallbacks && this.authCallbacks.buildUserPropertiesObject) {
        props = this.authCallbacks.buildUserPropertiesObject(AUTH0_SIGNIN, decoded);
      }

      if (!roles || !roles.length) {
        this.logger.warn(`No roles were provided by auth0 for ${normalisedEmail}`);
      }

      return this.authService.validateUserAuth0(
        newContext(this.datastore),
        id,
        normalisedEmail,
        name,
        orgId,
        roles,
        props,
      );
    });

  validateAuth = async (
    done: (error: Error | null, user: IUser | false, options?: IVerifyOptions) => void,
    auth: () => Promise<IUser>,
  ) => {
    try {
      const user = await auth();
      if (!user) {
        return done(null, false, new UnauthorizedException());
      }
      done(null, user);
    } catch (ex) {
      this.logger.error(ex);
      if (ex instanceof AuthenticationFailedException) {
        done(null, false, ex);
      } else {
        done(new UnauthorizedException(ex, 'Internal error'), false);
      }
    }
  };
}
