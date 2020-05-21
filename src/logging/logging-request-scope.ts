import { getRequestScopeValueOrDefault, RequestScopeInterceptor, setRequestScopeValue } from '../request-scope';
import { Inject, Injectable } from '@nestjs/common';
import { Configuration, CONFIGURATION } from '../configuration';
import { Request } from 'express';
import * as Logger from 'bunyan';
import { defaultLogger } from './logging-internal';

const key = '_LOGGER';
export const logger = () =>
  // Disabling via config allows short-circuiting of cls-hooked checks if performance is a concern
  LoggingRequestScopeInterceptor.isEnabled() ? getRequestScopeValueOrDefault(key, defaultLogger) : defaultLogger;

export interface RequestWithLog extends Request {
  log?: Logger;
}

@Injectable()
export class LoggingRequestScopeInterceptor implements RequestScopeInterceptor {
  readonly name: string = 'LoggingRequestScopeInterceptor';
  private static enabled: boolean;

  constructor(@Inject(CONFIGURATION) configurationProvider: Configuration) {
    LoggingRequestScopeInterceptor.enabled = !!configurationProvider.requestScope?.logBundlingEnabled;
  }

  intercept(req: RequestWithLog): void {
    // logger is added to the req object by the logging bunyan express middleware in configure.ts
    if (LoggingRequestScopeInterceptor.enabled && req.log) {
      setRequestScopeValue(key, req.log);
    } else {
      if (process.env.APP_ENGINE_ENVIRONMENT) {
        // We only set this up in appengine
        defaultLogger.warn(`${this.name}: Logger does not exist on Request, so cannot set it within request scope.`);
      }
    }
  }

  static isEnabled() {
    return LoggingRequestScopeInterceptor.enabled;
  }
}
