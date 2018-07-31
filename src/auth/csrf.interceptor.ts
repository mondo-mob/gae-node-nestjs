import { Response, NextFunction, RequestHandler } from 'express';
import * as uuid from 'node-uuid';

const generateToken = () =>
  process.env.APP_ENGINE_ENVIRONMENT ? uuid.v4() : 'development';

export const CsrfValidator: RequestHandler = (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  if (req.session && !req.session.csrf) {
    req.session.csrf = generateToken();
    res.cookie('csrf-token', req.session.csrf, {
      sameSite: true,
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
