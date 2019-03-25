import { MiddlewareFunction, NestMiddleware } from '@nestjs/common';
import { Request } from 'express';
import { Context, IUser } from './datastore/context';
import { DatastoreProvider } from './datastore/datastore.provider';
import { UserService } from './auth/user.service';
export interface RequestWithContext extends Request {
    context: Context;
}
export declare class ContextMiddleware implements NestMiddleware {
    private readonly datastoreProvider;
    private readonly userService;
    private readonly logger;
    constructor(datastoreProvider: DatastoreProvider, userService: UserService<IUser>);
    resolve(...args: any[]): MiddlewareFunction | Promise<MiddlewareFunction>;
}
