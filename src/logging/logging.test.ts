import { createLogger, rootLogger } from './logging';
import * as LoggingRequestScope from './logging-request-scope';
import * as Logger from 'bunyan';
import { reset, spy, when } from 'ts-mockito';
import { ERROR, INFO, WARN } from 'bunyan';

describe('logging', () => {
  let logSpy: any;
  let streamWriteSpy: any;

  const getLoggedValue = (): any => {
    return JSON.parse(streamWriteSpy.mock.calls[0][0]);
  };

  beforeEach(() => {
    logSpy = spy(LoggingRequestScope);
    streamWriteSpy = jest.spyOn(process.stdout, 'write'); // ts-mockito didn't work here
    when(logSpy.logger()).thenReturn(
      Logger.createLogger({
        name: 'jest-testing-logger',
        level: 'info',
        stream: process.stdout,
      }),
    );
  });
  afterEach(() => {
    reset(logSpy);
    jest.clearAllMocks();
  });

  describe('rootLogger', () => {
    it('logs info message without params', () => {
      rootLogger.info('test123');

      const loggedObject = getLoggedValue();
      expect(loggedObject.msg).toBe('test123');
      expect(loggedObject.level).toBe(INFO);
    });

    it('logs error message with params', () => {
      rootLogger.error('test123', 1, 2, 3);

      const loggedObject = getLoggedValue();
      expect(loggedObject.msg).toBe('test123 1 2 3');
      expect(loggedObject.level).toBe(ERROR);
    });

    it('logs warn message with array param', () => {
      rootLogger.warn('test123', [1, 2, 3]);

      const loggedObject = getLoggedValue();
      expect(loggedObject.msg).toBe('test123 [ 1, 2, 3 ]');
      expect(loggedObject.level).toBe(WARN);
    });

    it('does not log debug message when logger configured for info', () => {
      rootLogger.debug('test123', [1, 2, 3]);

      expect(streamWriteSpy.mock.calls).toHaveLength(0);
    });
  });

  describe('createLogger', () => {
    it('logs with logger name as prefix', () => {
      createLogger('LoggerName').info('test123');

      const loggedObject = getLoggedValue();
      expect(loggedObject.msg).toBe('LoggerName: test123');
      expect(loggedObject.level).toBe(INFO);
    });
  });
});
