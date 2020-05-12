import { RequestScopeInterceptor, RequestScopeMiddleware } from './request-scope.middleware';
import { getRequestScopeValue, getRequestScopeValueRequired, setRequestScopeValue } from './request-scope';
import { Request, Response } from 'express';
import { mock } from 'ts-mockito';
import { reset } from 'cls-hooked';

class TestInterceptor implements RequestScopeInterceptor {
  name = 'test-interceptor';

  intercept(req: Request): void {
    setRequestScopeValue('test-key', 'test-value');
  }
}

describe('RequestScopeInterceptor', () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    reset();
    req = mock<Request>();
    res = mock<Response>();
  });
  afterEach(() => {
    reset();
  });

  it('calls interceptors and shares request scope with anything within next function', () => {
    const middleware = new RequestScopeMiddleware([new TestInterceptor()]);

    middleware.use(req, res, () => {
      expect(getRequestScopeValueRequired('test-key')).toBe('test-value');
      expect(getRequestScopeValue('something-does-not-exist')).toBeNull();
    });
  });
});
