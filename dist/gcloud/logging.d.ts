import * as Logger from 'bunyan';
import { LoggerService } from '@nestjs/common';
export declare const rootLogger: Logger;
export declare const createLogger: (name: string) => Logger;
export declare class BunyanLogger implements LoggerService {
    log(message: string): void;
    error(message: string, trace: string): void;
    warn(message: string): void;
}
