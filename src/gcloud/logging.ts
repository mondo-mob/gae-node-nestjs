// import rTracer from 'cls-rtracer';
// tslint:disable-next-line:no-var-requires
const rTracer = require('cls-rtracer');

import { LoggingBunyan } from '@google-cloud/logging-bunyan';
import * as Logger from 'bunyan';
import { LoggerService } from '@nestjs/common';
import { Writable } from 'stream';

const traceLog = (message: any) => {
  const rid = rTracer.id();
  return rid ? `[request-id:${rid}]: ${message}` : `[noid: ${process.pid}]: ${message}`;
};

let streams: Array<Logger.Stream> = [
  {
    stream: process.stdout,
  },
];
if (process.env.APP_ENGINE_ENVIRONMENT) {
  const loggingBunyan = new LoggingBunyan();

  streams = [loggingBunyan.stream('info')];
}

export const rootLogger: Logger = Logger.createLogger({
  name: 'service',
  level: 'info',
  streams,
  requestId: () => rTracer.id(),
});

export const createLogger = (name: string): Logger => {
  return rootLogger.child({
    service: name,
  });
};

export class CustomLogger {
  private logger: Logger;

  constructor(name: string) {
    this.logger = rootLogger.child({
      service: name,
    });
  }

  info(message: string): void {
    this.logger.info(traceLog(message));
  }
  error(message: string, trace: string) {
    this.logger.error(traceLog(message), { errorTrace: trace });
  }
  debug(message: string) {
    this.logger.warn(traceLog(message));
  }
}

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
