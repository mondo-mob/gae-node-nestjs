import { createNamespace, Namespace } from 'cls-hooked';
import { Inject, Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { Request, Response } from 'express';
import { _REQUEST_STORAGE_NAMESPACE_KEY } from './request-scope';
import { rootLogger } from '..';

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
  private namespace: Namespace;
  constructor(@Inject(REQUEST_SCOPE_INTERCEPTORS) private readonly interceptors: RequestScopeInterceptor[]) {
    this.namespace = createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY);
    const interceptorNames = interceptors.map((interceptor) => `   - ${interceptor.name}`).join('\n');
    rootLogger.info(`RequestScopeMiddleware setup up with interceptors: \n${interceptorNames}`);
  }

  use(req: Request, res: Response, next: () => void) {
    this.namespace.run(() => {
      this.interceptors.forEach((interceptor) => {
        interceptor.intercept(req);
      });
      next();
    });
  }
}
