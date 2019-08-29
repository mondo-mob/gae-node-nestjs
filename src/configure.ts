/* tslint:disable:ban-types */
import * as DatastoreStore from '@google-cloud/connect-datastore';
import { Datastore } from '@google-cloud/datastore';
import { CookieOptions, NextFunction, RequestHandler, Response } from 'express';
import * as session from 'express-session';
import * as csp from 'helmet-csp';
import * as passport from 'passport';
import { CsrfValidatorWithOptions } from './auth/csrf.interceptor';
import { rootLogger } from './gcloud/logging';
import { asArray, OneOrMany } from './util/types';

const minutesToMilliseconds = (minutes: number) => minutes * 60 * 1000;

const MAX_AGE_DEFAULT = minutesToMilliseconds(2 * 60); // 2 hours

interface ServerOptions {
  csp?: object;
  csrf?: {
    ignorePaths?: OneOrMany<string | RegExp>;
    sameSite?: boolean;
    disabled?: boolean;
  };
  session: {
    secret: string;
    projectId?: string;
    apiEndpoint?: string;
    cookie?: CookieOptions;
  };
  sessionTimeoutInMinutes?: number;
}

interface Express {
  use(...handlers: Function[]): void;

  use(paths: OneOrMany<string | RegExp>, ...handlers: Function[]): void;

  set(property: string, value: boolean): void;
}

export const configureExpress = (expressApp: Express, options: ServerOptions) => {
  const SessionStore = DatastoreStore(session);

  expressApp.use(
    csp(
      options.csp || {
        directives: {
          defaultSrc: ['\'none\''],
          scriptSrc: ['\'self\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
          fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
          imgSrc: ['\'self\'', 'data: ', 'https://secure.gravatar.com/'],
          connectSrc: ['\'self\'', 'https://www.googleapis.com'],
          manifestSrc: ['\'self\''],
        },
      },
    ),
  );

  // Force secure session cookie in app engine / prod
  let secure: boolean | 'auto' = (options.session.cookie && options.session.cookie.secure) || false;
  if (process.env.NODE_ENV === 'production' && process.env.APP_ENGINE_ENVIRONMENT) {
    expressApp.set('trust proxy', true);
    secure = true;
    rootLogger.info('Cookie secured for prod');
  }

  const sessionAge = options.sessionTimeoutInMinutes
    ? minutesToMilliseconds(options.sessionTimeoutInMinutes)
    : MAX_AGE_DEFAULT;
  rootLogger.info(`Session age set to: ${sessionAge} ms`);
  expressApp.use(
    session({
      saveUninitialized: true,
      resave: true,
      rolling: true,
      store: new SessionStore({
        dataset: new Datastore({
          prefix: 'express-sessions',
          apiEndpoint: options.session.apiEndpoint,
          projectId: options.session.projectId,
        } as any),
      }),
      secret: options.session.secret,
      cookie: {
        maxAge: sessionAge,
        ...options.session.cookie,
        secure,
      },
    }),
  );

  const { ignorePaths = [/^\/(tasks\/|system\/).*/], sameSite = true, disabled: csrfDisabled = false } =
    options.csrf || {};

  // Allows us to specify positive matches for ignoring rather than complex negative lookaheads
  // See https://stackoverflow.com/questions/27117337/exclude-route-from-express-middleware
  const unless = (exclusions: OneOrMany<string | RegExp>, middleware: RequestHandler) => {
    return (req: any, res: Response, next: NextFunction) => {
      const matchesExclusion = asArray(exclusions).some(path =>
        typeof path.test === 'function' ? (path as RegExp).test(req.path) : path === req.path,
      );
      matchesExclusion ? next() : middleware(req, res, next);
    };
  };

  expressApp.use(passport.initialize());
  expressApp.use(passport.session());

  if (!csrfDisabled) {
    // Enable CSRF token validation
    const csrfValidator = CsrfValidatorWithOptions({ sameSite });
    expressApp.use(unless(ignorePaths, csrfValidator));
  }
};
