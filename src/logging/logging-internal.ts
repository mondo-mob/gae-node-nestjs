import * as BunyanLoggerInterface from 'bunyan';
import * as Logger from 'bunyan';
import { LoggingBunyan } from '@google-cloud/logging-bunyan';

let streams: Array<BunyanLoggerInterface.Stream> = [
  {
    stream: process.stdout,
  },
];
if (process.env.APP_ENGINE_ENVIRONMENT) {
  const loggingBunyan = new LoggingBunyan();

  streams = [loggingBunyan.stream('info')];
}

export const defaultLogger: Logger = Logger.createLogger({
  name: 'service',
  level: 'info',
  streams,
});
