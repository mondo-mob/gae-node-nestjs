import * as passport from "passport";
import { CsrfValidator } from "./auth/csrf.interceptor";
import * as Datastore from "@google-cloud/datastore";
import * as session from "express-session";
import * as express from "express";
import * as DatastoreStore from "@google-cloud/connect-datastore";
import { OneOrMany } from "@google-cloud/datastore/entity";
import { rootLogger } from "./gcloud/logging";

interface ServerOptions {
  csrf?: {
    ignorePaths: OneOrMany<string | RegExp>;
  };
  session: {
    secret: string;
  };
}

interface Express {
  use(...handlers: Function[]): void;
  use(paths: OneOrMany<string | RegExp>, ...handlers: Function[]): void;
}

export const configureExpress = (
  expressApp: Express,
  options: ServerOptions
) => {
  const SessionStore = DatastoreStore(session);

  expressApp.use(
    session({
      saveUninitialized: true,
      resave: false,
      store: new SessionStore({
        dataset: new Datastore({
          prefix: "express-sessions"
        } as any)
      }),
      secret: options.session.secret
    })
  );

  const { ignorePaths = [/^\/(?!tasks\/|system\/).*/] } = options.csrf || {};

  expressApp.use(passport.initialize());
  expressApp.use(passport.session());
  expressApp.use(ignorePaths, CsrfValidator);
};
