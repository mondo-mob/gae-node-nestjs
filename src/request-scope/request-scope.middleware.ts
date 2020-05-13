import { createNamespace, Namespace } from 'cls-hooked';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { _REQUEST_STORAGE_NAMESPACE_KEY } from './request-scope';
import { Configuration, CONFIGURATION, rootLogger } from '..';

export interface RequestScopeInterceptor {
  /**
   * Name of the interceptor for logging and auditing purposes.
   */
  readonly name: string;
  /**
   * Hook to intercept request and set values into request-scope, specifically for the lifecycle of the given request.
   */
  intercept(req: Request): void;
}

export const REQUEST_SCOPE_INTERCEPTORS = 'REQ_SCOPE_INTERCEPTORS';

@Injectable()
export class RequestScopeMiddleware implements NestMiddleware {
  private readonly namespace?: Namespace;
  private readonly enabled: boolean;

  constructor(
    @Inject(CONFIGURATION) configurationProvider: Configuration,
    @Inject(REQUEST_SCOPE_INTERCEPTORS) private readonly interceptors: RequestScopeInterceptor[],
  ) {
    // Enabled by default
    const disabled = configurationProvider.requestScope?.enabled === false;
    this.enabled = !disabled;
    if (this.enabled) {
      this.namespace = createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY);
      const interceptorNames = interceptors.map((interceptor) => `   - ${interceptor.name}`).join('\n');
      rootLogger.info(`RequestScopeMiddleware setup up with interceptors: \n${interceptorNames}`);
    } else {
      rootLogger.info('RequestScopeMiddleware disabled by config');
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
}
