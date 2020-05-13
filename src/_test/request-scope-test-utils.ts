import { instance, mock } from 'ts-mockito';
import { RequestWithContext } from '..';
import { RequestScopeInterceptor } from '../request-scope';
import { RequestScopeMiddleware } from '../request-scope/request-scope.middleware';
import { isMock, partialInstance } from './mocks';
import { Response } from 'express';

export const interceptorTest = (
  interceptor: RequestScopeInterceptor,
  req: RequestWithContext,
  testAssertions: () => void,
) => {
  const request = isMock(req) ? instance(req) : req;
  let nextCalled = false;
  new RequestScopeMiddleware(partialInstance(), [interceptor]).use(request, instance(mock<Response>()), () => {
    nextCalled = true;
    testAssertions();
  });
  expect(nextCalled).toBe(true);
};
