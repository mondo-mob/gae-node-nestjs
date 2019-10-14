import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import * as Logger from 'bunyan';
import * as _ from 'lodash';
import { Request, Response } from 'express';
import { Context, IUser, newContext } from './datastore/context';
import { DatastoreProvider } from './datastore/datastore.provider';
import { USER_SERVICE, UserService } from './auth/user.service';
import { createLogger } from './gcloud/logging';

export interface RequestWithContext extends Request {
  context: Context;
}

@Injectable()
export class ContextMiddleware implements NestMiddleware<RequestWithContext> {
  private readonly logger: Logger;

  constructor(
    private readonly datastoreProvider: DatastoreProvider,
    @Inject(USER_SERVICE) private readonly userService: UserService<IUser>,
  ) {
    this.logger = createLogger('context-middleware');
  }

  async use(req: RequestWithContext, res: Response, next: Function) {
    this.logger.info(`[${req.method}]: ${req.originalUrl}`);

    const requestContext = newContext(this.datastoreProvider.datastore);

    const userId = _.get(req, 'session.passport.user.id');

    if (userId && !req.is('text/html')) {
      requestContext.user = await this.userService.get(requestContext, userId);
    }

    // For GraphQL the request is not available in the ExecutionContext so include
    // it in our custom context so we can access it in things like auth guards.
    requestContext.request = req;

    req.context = requestContext;

    if (next) {
      next();
    }
  }
}
