import { RequestScopeInterceptor, setRequestScopeValue } from '../request-scope';
import { Injectable } from '@nestjs/common';
import { rootLogger } from '..';
import { getRequestScopeValueOrDefault } from '../request-scope/request-scope';
import { Request } from 'express';
import * as Logger from 'bunyan';

const key = '_LOGGER';
export const logger = (): Logger => getRequestScopeValueOrDefault(key, rootLogger);

export interface RequestWithLog extends Request {
  log?: Logger;
}

@Injectable()
export class LoggingRequestScopeInterceptor implements RequestScopeInterceptor {
  readonly name: string = 'LoggingRequestScopeInterceptor';

  intercept(req: RequestWithLog): void {
    // logger is added to the req object by the logging bunyan express middleware in configure.ts
    if (req.log) {
      setRequestScopeValue(key, req.log);
    } else {
      if (process.env.APP_ENGINE_ENVIRONMENT) {
        // We only set this up in appengine
        rootLogger.warn(`${this.name}: Logger does not exist on Request, so cannot set it within request scope.`);
      }
    }
  }
}
