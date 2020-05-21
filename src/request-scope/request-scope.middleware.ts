import { createNamespace, Namespace } from 'cls-hooked';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestScopeInterceptor } from './request-scope-interceptor';
import { defaultLogger } from '../logging/logging-internal';
import { Configuration, CONFIGURATION } from '../configuration';

export const _REQUEST_STORAGE_NAMESPACE_KEY = '_GAE_NODE_NESTJS_REQUEST_STORAGE';
export const REQUEST_SCOPE_INTERCEPTORS = 'REQ_SCOPE_INTERCEPTORS';

@Injectable()
export class RequestScopeMiddleware implements NestMiddleware {
  private readonly namespace?: Namespace;
  private static enabled: boolean;

  constructor(
    @Inject(CONFIGURATION) configurationProvider: Configuration,
    @Inject(REQUEST_SCOPE_INTERCEPTORS) private readonly interceptors: RequestScopeInterceptor[],
  ) {
    // Disabled by default
    RequestScopeMiddleware.enabled = !!configurationProvider.requestScope?.enabled;
    if (RequestScopeMiddleware.enabled) {
      this.namespace = createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY);
      const interceptorNames = interceptors.map((interceptor) => `   - ${interceptor.name}`).join('\n');
      defaultLogger.info(`RequestScopeMiddleware setup up with interceptors: \n${interceptorNames}`);
    } else {
      defaultLogger.info('RequestScopeMiddleware disabled by config');
    }
  }

  use(req: Request, res: Response, next: () => void) {
    if (this.namespace) {
      this.namespace.run(() => {
        this.interceptors.forEach((interceptor) => {
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
