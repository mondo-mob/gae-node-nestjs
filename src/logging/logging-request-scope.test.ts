import { reset } from 'cls-hooked';
import { mock, when } from 'ts-mockito';
import { interceptorTest } from '../_test/request-scope-test-utils';
import { logger, LoggingRequestScopeInterceptor, RequestWithLog } from './logging-request-scope';
import * as Logger from 'bunyan';
import { partialInstance } from '../_test/mocks';
import { Configuration, rootLogger } from '..';

describe('Context Request Scope', () => {
  let interceptor: LoggingRequestScopeInterceptor;
  let req: RequestWithLog;
  let testLogger: Logger;

  beforeEach(() => {
    reset();
    interceptor = new LoggingRequestScopeInterceptor(
      partialInstance<Configuration>({ requestScope: { logBundlingEnabled: true } }),
    );
    testLogger = partialInstance();
    req = mock<RequestWithLog>();
  });
  afterEach(() => {
    reset();
  });

  it('sets logger on request scope when enabled and log exists on req', () => {
    when(req.log).thenReturn(testLogger);

    interceptorTest(interceptor, req, () => {
      expect(logger()).toBe(testLogger);
      expect(logger()).not.toBe(rootLogger);
    });
  });

  it('safely ignores logger in interceptor when enabled req.log is null and logger() returns rootLogger by default', () => {
    when(req.log).thenReturn(undefined);

    interceptorTest(interceptor, req, () => {
      expect(logger()).toBe(rootLogger);
      expect(logger()).not.toBe(testLogger);
    });
  });

  it('safely ignores logger in interceptor when disabled by config', () => {
    interceptor = new LoggingRequestScopeInterceptor(
      partialInstance<Configuration>({ requestScope: { logBundlingEnabled: false } }),
    );
    when(req.log).thenReturn(testLogger);

    interceptorTest(interceptor, req, () => {
      expect(logger()).toBe(rootLogger);
      expect(logger()).not.toBe(testLogger);
    });
  });

  it('safely ignores logger in interceptor when config not set (disabled by default)', () => {
    interceptor = new LoggingRequestScopeInterceptor(partialInstance());
    when(req.log).thenReturn(testLogger);

    interceptorTest(interceptor, req, () => {
      expect(logger()).toBe(rootLogger);
      expect(logger()).not.toBe(testLogger);
    });
  });
});
