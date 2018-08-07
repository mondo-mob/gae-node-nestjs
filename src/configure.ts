import * as DatastoreStore from '@google-cloud/connect-datastore';
import * as Datastore from '@google-cloud/datastore';
import {OneOrMany} from '@google-cloud/datastore/entity';
import * as session from 'express-session';
import * as passport from 'passport';
import {CsrfValidator} from './auth/csrf.interceptor';
import * as csp from 'helmet-csp';
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
  };
}

interface Express {
  use(...handlers: Function[]): void;
  use(paths: OneOrMany<string | RegExp>, ...handlers: Function[]): void;
  set(property: string, value: boolean): any;
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
        connectSrc: ['\'self\''],
      },
    }),
  );

  rootLogger.info('process.env.APP_ENGINE_ENVIRONMENT:', process.env.APP_ENGINE_ENVIRONMENT);

  const cookieConfig: { secure: boolean | 'auto' } = { secure: false };
  rootLogger.info('Cookie config before:', cookieConfig);

  if (process.env.NODE_ENV === 'production') {
    rootLogger.info('We in prod now');
    expressApp.set('trust proxy', true);
    cookieConfig.secure = true;
  }
  rootLogger.info('Cookie config after:', cookieConfig);

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
      cookie: cookieConfig,
    }),
  );

  const { ignorePaths = [/^\/(?!tasks\/|system\/).*/] } = options.csrf || {};

  expressApp.use(passport.initialize());
  expressApp.use(passport.session());
  expressApp.use(ignorePaths, CsrfValidator);
};
