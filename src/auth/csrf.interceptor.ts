import { Response, NextFunction, RequestHandler } from 'express';
import * as uuid from 'node-uuid';
import { Request } from 'express-serve-static-core';

const generateToken = () =>
  process.env.APP_ENGINE_ENVIRONMENT ? uuid.v4() : 'development';

interface CsrfValidatorOptions {
  sameSite: boolean;
}

const defaultValidatorOptions: CsrfValidatorOptions = {
  sameSite: true,
};

interface RequestHandlerWithOptions {
  // tslint:disable-next-line callable-types
  (req: Request, res: Response, next: NextFunction, options: CsrfValidatorOptions): any;
}

export const CsrfValidator: RequestHandlerWithOptions = (
  req: any,
  res: Response,
  next: NextFunction,
  options: CsrfValidatorOptions,
) => {
  options = {...defaultValidatorOptions, ...options};

  if (req.session && !req.session.csrf) {
    req.session.csrf = generateToken();
    res.cookie('csrf-token', req.session.csrf, {
      sameSite: options.sameSite,
      maxAge: 9999999,
    });
  }

  if (
    req.method === 'GET' ||
    req.method === 'OPTIONS' ||
    req.method === 'HEAD'
  ) {
    return next();
  }

  if (req.headers && req.session) {
    const token = req.headers['x-csrf-token'];

    if (token && token === req.session.csrf) {
      return next();
    }
  }

  res.status(403).send({
    message: 'Invalid CSRF token',
  });
};

export const CsrfValidatorWithOptions = (options: CsrfValidatorOptions) => {
  return (req: any, res: Response, next: NextFunction): RequestHandler => {
    return CsrfValidator(req, res, next, options);
  }
};
