import { Request } from 'express';

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
