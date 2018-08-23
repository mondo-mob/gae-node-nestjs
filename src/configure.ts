import * as DatastoreStore from '@google-cloud/connect-datastore';
import * as Datastore from '@google-cloud/datastore';
import {OneOrMany} from '@google-cloud/datastore/entity';
import {CookieOptions} from 'express';
import * as session from 'express-session';
import * as csp from 'helmet-csp';
import * as passport from 'passport';
import {CsrfValidator} from './auth/csrf.interceptor';
import {rootLogger} from './gcloud/logging';

interface ServerOptions {
  csp?: object,
  csrf?: {
    ignorePaths: OneOrMany<string | RegExp>;
  };
  session: {
    secret: string;
    projectId?: string;
    apiEndpoint?: string;
    cookie?: CookieOptions;
  };
}

interface Express {
  use(...handlers: Function[]): void;

  use(paths: OneOrMany<string | RegExp>, ...handlers: Function[]): void;

  set(property: string, value: boolean): void;
}

export const configureExpress = (
  expressApp: Express,
  options: ServerOptions,
) => {
  const SessionStore = DatastoreStore(session);

  expressApp.use(
    csp(options.csp || {
      directives: {
        defaultSrc: ['\'none\''],
        scriptSrc: ['\'self\''],
        styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
        fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
        imgSrc: ['\'self\''],
        connectSrc: ['\'self\'', 'https://www.googleapis.com'],
      },
    }),
  );

  // Force secure session cookie in app engine / prod
  let secure: boolean | 'auto' = (options.session.cookie && options.session.cookie.secure) || false;
  if (process.env.NODE_ENV === 'production' && process.env.APP_ENGINE_ENVIRONMENT) {
    expressApp.set('trust proxy', true);
    secure = true;
    rootLogger.info('Cookie secured for prod');
  }
  expressApp.use(
    session({
      saveUninitialized: true,
      resave: false,
      store: new SessionStore({
        dataset: new Datastore({
          prefix: 'express-sessions',
          apiEndpoint: options.session.apiEndpoint,
          projectId: options.session.projectId,
        } as any),
      }),
      secret: options.session.secret,
      cookie: {...options.session.cookie, secure},
    }),
  );

  const {ignorePaths = [/^\/(?!tasks\/|system\/).*/]} = options.csrf || {};

  expressApp.use(passport.initialize());
  expressApp.use(passport.session());
  expressApp.use(ignorePaths, CsrfValidator);
};
