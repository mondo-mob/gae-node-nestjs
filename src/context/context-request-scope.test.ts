import { RequestWithContext } from './context-middleware';
import { reset } from 'cls-hooked';
import { ContextRequestScopeInterceptor, getContext } from './context-request-scope';
import { instance, mock, when } from 'ts-mockito';
import { mockContext } from '../auth/auth.service.test';
import { RequestScopeMiddleware } from '../request-scope/request-scope.middleware';
import { Response } from 'express';

describe('Context Request Scope', () => {
  let interceptor: ContextRequestScopeInterceptor;
  let req: RequestWithContext;
  let res: Response;

  beforeEach(() => {
    reset();
    interceptor = new ContextRequestScopeInterceptor();
    req = mock<RequestWithContext>();
    res = mock<Response>();
  });
  afterEach(() => {
    reset();
  });

  it('sets context on request scope when context exists on req', () => {
    const context = mockContext();
    when(req.context).thenReturn(context);

    new RequestScopeMiddleware([interceptor]).use(instance(req), res, () => {
      expect(getContext()).toEqual(context);
    });
  });

  it('safely ignores context in interceptor when req.context is null, but fails if code tries to get context', () => {
    // @ts-ignore
    when(req.context).thenReturn(null);

    new RequestScopeMiddleware([interceptor]).use(instance(req), res, () => {
      expect(() => getContext()).toThrowError('No request scoped value exists for key: _CONTEXT');
    });
  });
});
