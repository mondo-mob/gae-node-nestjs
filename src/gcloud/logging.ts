import { LoggingBunyan } from '@google-cloud/logging-bunyan';
import * as Logger from 'bunyan';
import { LoggerService } from '@nestjs/common';

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
});

export const createLogger = (_: string): Logger => {
  // TODO: rootLogger.child() is not working and returns a stdout logger in raw json format in stackdriver that is hard to read
  return rootLogger;
};

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
