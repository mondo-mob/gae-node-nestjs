import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestScopeInterceptor } from './request-scope-interceptor';
import { requestScopeStorage } from './request-scope-storage';
import { defaultLogger } from '../logging/logging-internal';
import { Configuration, CONFIGURATION } from '../configuration';

export const REQUEST_SCOPE_INTERCEPTORS = 'REQ_SCOPE_INTERCEPTORS';

@Injectable()
export class RequestScopeMiddleware implements NestMiddleware {
  private readonly active: boolean;
  private static enabled: boolean;

  constructor(
    @Inject(CONFIGURATION) configurationProvider: Configuration,
    @Inject(REQUEST_SCOPE_INTERCEPTORS) private readonly interceptors: RequestScopeInterceptor[],
  ) {
    // Disabled by default
    RequestScopeMiddleware.enabled = !!configurationProvider.requestScope?.enabled;
    this.active = RequestScopeMiddleware.enabled;
    if (this.active) {
      const interceptorNames = interceptors.map(interceptor => `   - ${interceptor.name}`).join('\n');
      defaultLogger.info(`RequestScopeMiddleware setup up with interceptors: \n${interceptorNames}`);
    } else {
      defaultLogger.info('RequestScopeMiddleware disabled by config');
    }
  }

  use(req: Request, res: Response, next: () => void) {
    if (this.active) {
      requestScopeStorage.run(new Map(), () => {
        this.interceptors.forEach(interceptor => {
          interceptor.intercept(req);
        });
        next();
      });
    } else {
      next();
    }
  }

  static isEnabled() {
    return RequestScopeMiddleware.enabled;
  }

  static isDisabled() {
    return !RequestScopeMiddleware.isEnabled();
  }
}
