/* tslint:disable:ban-types */
import * as DatastoreStore from '@google-cloud/connect-datastore';
import { Datastore } from '@google-cloud/datastore';
import * as express from 'express';
import { NextFunction, RequestHandler, Response } from 'express';
import * as session from 'express-session';
import * as csp from 'helmet-csp';
import * as passport from 'passport';
import { CsrfValidatorWithOptions } from './auth/csrf.interceptor';
import { asArray, OneOrMany } from './util/types';
import { ServeStaticOptions } from 'serve-static';
import * as lb from '@google-cloud/logging-bunyan';
import { defaultLogger } from './logging/logging-internal';

const minutesToMilliseconds = (minutes: number) => minutes * 60 * 1000;

const MAX_AGE_DEFAULT = minutesToMilliseconds(2 * 60); // 2 hours

interface CookieOptions {
  maxAge?: number;
  signed?: boolean;
  expires?: Date;
  httpOnly?: boolean;
  path?: string;
  domain?: string;
  secure?: boolean | 'auto';
  encode?: (val: string) => string;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
}

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
  staticAssets?: {
    options?: ServeStaticOptions;
    prefix?: string;
    root: string;
  };
}

interface Express {
  use(...handlers: Function[]): void;

  use(paths: OneOrMany<string | RegExp>, ...handlers: Function[]): void;

  set(property: string, value: boolean): void;
}

export const configureExpress = async (expressApp: Express, options: ServerOptions) => {
  const SessionStore = DatastoreStore(session);

  if (process.env.APP_ENGINE_ENVIRONMENT) {
    const { mw } = await lb.express.middleware({ level: 'info' });
    expressApp.use(mw);
  }

  expressApp.use(
    csp(
      options.csp || {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data: ', 'https://secure.gravatar.com/'],
          connectSrc: ["'self'", 'https://www.googleapis.com'],
          manifestSrc: ["'self'"],
        },
      },
    ),
  );

  // Configure static assets before session middleware so that they do not interact with session flow
  // e.g. additional overhead loading sessions, creating unwanted sessions, etc
  const { staticAssets } = options;
  if (staticAssets) {
    // By default disable automatically sending index.html for folder root (i.e. https://www.site.com/)
    // Allows index.html to be served consistently from other routes, which may have special
    // processing - e.g. ensuring session is saved before returning content.
    const staticOptions: ServeStaticOptions = staticAssets.options || {
      index: false,
    };
    if (staticAssets.prefix) {
      defaultLogger.info(`Serving static assets from ${staticAssets.root} on prefix ${staticAssets.prefix}`);
      expressApp.use(staticAssets.prefix, express.static(staticAssets.root, staticOptions));
    } else {
      defaultLogger.info(`Serving static assets from ${staticAssets.root}`);
      expressApp.use(express.static(staticAssets.root, staticOptions));
    }
  }

  // Force secure session cookie in app engine / prod
  let secure: boolean | 'auto' = (options.session.cookie && options.session.cookie.secure) || false;
  if (process.env.NODE_ENV === 'production' && process.env.APP_ENGINE_ENVIRONMENT) {
    expressApp.set('trust proxy', true);
    secure = true;
    defaultLogger.info('Cookie secured for prod');
  }

  const sessionAge = options.sessionTimeoutInMinutes
    ? minutesToMilliseconds(options.sessionTimeoutInMinutes)
    : MAX_AGE_DEFAULT;
  defaultLogger.info(`Session age set to: ${sessionAge} ms`);
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
      const matchesExclusion = asArray(exclusions).some((path) =>
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
