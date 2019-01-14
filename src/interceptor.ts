import {
  createParamDecorator,
  Injectable,
  MiddlewareFunction,
  NestMiddleware,
  Inject,
} from '@nestjs/common';
import * as Logger from 'bunyan';
import * as _ from 'lodash';
import { Request } from 'express';
import { Context, IUser, newContext } from './datastore/context';
import { DatastoreProvider } from './datastore/datastore.provider';
import { UserService, USER_SERVICE } from './auth/user.service';
import { createLogger } from './gcloud/logging';

export interface RequestWithContext extends Request {
  context: Context;
}

@Injectable()
export class ContextMiddleware implements NestMiddleware {
  private readonly logger: Logger;

  constructor(
    private readonly datastoreProvider: DatastoreProvider,
    @Inject(USER_SERVICE) private readonly userService: UserService<IUser>,
  ) {
    this.logger = createLogger('context-middleware');
  }

  resolve(...args: any[]): MiddlewareFunction | Promise<MiddlewareFunction> {
    return async (req: RequestWithContext, res, next) => {
      this.logger.debug(`[${req.method}]: ${req.originalUrl}`);

      const requestContext = newContext(this.datastoreProvider.datastore);

      const userId = _.get(req, 'session.passport.user.id');

      if (userId && !req.is('text/html')) {
        requestContext.user = await this.userService.get(
          requestContext,
          userId,
        );
      }

      req.context = requestContext;

      if (next) {
        next();
      }
    };
  }
}
