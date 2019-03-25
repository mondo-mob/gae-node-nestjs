import { CookieOptions } from 'express';
import { OneOrMany } from './util/types';
interface ServerOptions {
    csp?: object;
    csrf?: {
        ignorePaths: OneOrMany<string | RegExp>;
    };
    session: {
        secret: string;
        projectId?: string;
        apiEndpoint?: string;
        cookie?: CookieOptions;
    };
}
interface Express {
    use(...handlers: Function[]): void;
    use(paths: OneOrMany<string | RegExp>, ...handlers: Function[]): void;
    set(property: string, value: boolean): void;
}
export declare const configureExpress: (expressApp: Express, options: ServerOptions) => void;
export {};
