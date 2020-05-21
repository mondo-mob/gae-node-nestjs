import { LoggerService } from '@nestjs/common';
import { logger } from './logging-request-scope';
// tslint:disable:unified-signatures
class LoggerImpl implements Logger {
  private readonly prefix: string;

  constructor(name?: string) {
    this.prefix = name ? `${name}: ` : '';
  }

  debug(): boolean;
  debug(error: Error, ...params: any[]): void;
  debug(obj: object, ...params: any[]): void;
  debug(format: any, ...params: any[]): void;
  debug(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    const firstParam = this.prefixIfString(formatOrObjOrErr);
    return params.length ? logger().debug(firstParam, ...params) : logger().debug(firstParam);
  }

  error(): boolean;
  error(error: Error, ...params: any[]): void;
  error(obj: object, ...params: any[]): void;
  error(format: any, ...params: any[]): void;
  error(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    const firstParam = this.prefixIfString(formatOrObjOrErr);
    return params.length ? logger().error(firstParam, ...params) : logger().error(firstParam);
  }

  fatal(): boolean;
  fatal(error: Error, ...params: any[]): void;
  fatal(obj: object, ...params: any[]): void;
  fatal(format: any, ...params: any[]): void;
  fatal(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    const firstParam = this.prefixIfString(formatOrObjOrErr);
    return params.length ? logger().fatal(firstParam, ...params) : logger().fatal(firstParam);
  }

  info(): boolean;
  info(error: Error, ...params: any[]): void;
  info(obj: object, ...params: any[]): void;
  info(format: any, ...params: any[]): void;
  info(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    const firstParam = this.prefixIfString(formatOrObjOrErr);
    return params.length ? logger().info(firstParam, ...params) : logger().info(firstParam);
  }

  trace(): boolean;
  trace(error: Error, ...params: any[]): void;
  trace(obj: object, ...params: any[]): void;
  trace(format: any, ...params: any[]): void;
  trace(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    const firstParam = this.prefixIfString(formatOrObjOrErr);
    return params.length ? logger().trace(firstParam, ...params) : logger().trace(firstParam);
  }

  warn(): boolean;
  warn(error: Error, ...params: any[]): void;
  warn(obj: object, ...params: any[]): void;
  warn(format: any, ...params: any[]): void;
  warn(formatOrObjOrErr?: any, ...params: any[]): boolean | void {
    const firstParam = this.prefixIfString(formatOrObjOrErr);
    return params.length ? logger().warn(firstParam, ...params) : logger().warn(firstParam);
  }

  private prefixIfString(param: any) {
    if (typeof param === 'string') {
      return `${this.prefix}${param}`;
    }
    return param;
  }
}

/**
 * Logging portion of Bunyan's Logger interface extracted to expose core logging functionality only. Signatures and jsdoc copied from Bunyan.
 */
export interface Logger {
  /**
   * Returns a boolean: is the `trace` level enabled?
   *
   * This is equivalent to `log.isTraceEnabled()` or `log.isEnabledFor(TRACE)` in log4j.
   */
  trace(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  trace(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  trace(obj: object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  trace(format: any, ...params: any[]): void;

  /**
   * Returns a boolean: is the `debug` level enabled?
   *
   * This is equivalent to `log.isDebugEnabled()` or `log.isEnabledFor(DEBUG)` in log4j.
   */
  debug(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  debug(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  debug(obj: object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  debug(format: any, ...params: any[]): void;

  /**
   * Returns a boolean: is the `info` level enabled?
   *
   * This is equivalent to `log.isInfoEnabled()` or `log.isEnabledFor(INFO)` in log4j.
   */
  info(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  info(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  info(obj: object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  info(format: any, ...params: any[]): void;

  /**
   * Returns a boolean: is the `warn` level enabled?
   *
   * This is equivalent to `log.isWarnEnabled()` or `log.isEnabledFor(WARN)` in log4j.
   */
  warn(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  warn(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  warn(obj: object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  warn(format: any, ...params: any[]): void;

  /**
   * Returns a boolean: is the `error` level enabled?
   *
   * This is equivalent to `log.isErrorEnabled()` or `log.isEnabledFor(ERROR)` in log4j.
   */
  error(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  error(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  error(obj: object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  error(format: any, ...params: any[]): void;

  /**
   * Returns a boolean: is the `fatal` level enabled?
   *
   * This is equivalent to `log.isFatalEnabled()` or `log.isEnabledFor(FATAL)` in log4j.
   */
  fatal(): boolean;

  /**
   * Special case to log an `Error` instance to the record.
   * This adds an `err` field with exception details
   * (including the stack) and sets `msg` to the exception
   * message or you can specify the `msg`.
   */
  fatal(error: Error, ...params: any[]): void;

  /**
   * The first field can optionally be a "fields" object, which
   * is merged into the log record.
   *
   * To pass in an Error *and* other fields, use the `err`
   * field name for the Error instance.
   */
  fatal(obj: object, ...params: any[]): void;

  /**
   * Uses `util.format` for msg formatting.
   */
  fatal(format: any, ...params: any[]): void;
}

export const rootLogger: Logger = new LoggerImpl();

export const createLogger = (name: string): Logger => new LoggerImpl(name);

export class BunyanLogger implements LoggerService {
  log(message: string) {
    rootLogger.info(message);
  }
  error(message: string, trace: string) {
    rootLogger.error(message, { errorTrace: trace });
  }
  warn(message: string) {
    rootLogger.warn(message);
  }
}
