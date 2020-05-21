import { RequestWithContext } from './context-middleware';
import { reset } from 'cls-hooked';
import { ContextRequestScopeInterceptor, getContext } from './context-request-scope';
import { mock, when } from 'ts-mockito';
import { interceptorTest } from '../_test/request-scope-test-utils';
import { mockContext } from '../_test/mocks';

describe('Context Request Scope', () => {
  let interceptor: ContextRequestScopeInterceptor;
  let req: RequestWithContext;

  beforeEach(() => {
    reset();
    interceptor = new ContextRequestScopeInterceptor();
    req = mock<RequestWithContext>();
  });
  afterEach(() => {
    reset();
  });

  it('sets context on request scope when context exists on req', () => {
    const context = mockContext();
    when(req.context).thenReturn(context);

    interceptorTest(interceptor, req, () => {
      expect(getContext()).toEqual(context);
    });
  });

  it('safely ignores context in interceptor when req.context is null, but fails if code tries to get context', () => {
    // @ts-ignore
    when(req.context).thenReturn(null);

    interceptorTest(interceptor, req, () => {
      expect(() => getContext()).toThrowError('No request scoped value exists for key: _CONTEXT');
    });
  });
});
