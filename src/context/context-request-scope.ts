import { RequestScopeInterceptor, setRequestScopeValue } from '../request-scope';
import { Injectable } from '@nestjs/common';
import { RequestWithContext } from './context-middleware';
import { Context, rootLogger } from '..';
import { getRequestScopeValueRequired } from '../request-scope/request-scope';

export const getContext = (): Context => getRequestScopeValueRequired('_CONTEXT');

@Injectable()
export class ContextRequestScopeInterceptor implements RequestScopeInterceptor {
  readonly name: string = 'ContextRequestScopeInterceptor';

  intercept(req: RequestWithContext): void {
    if (req.context) {
      rootLogger.info(`${this.name}: Setting context onto request scope`);
      setRequestScopeValue('_CONTEXT', req.context);
    } else {
      rootLogger.warn(
        `${this.name}: Context does not exist on Request, so cannot set it within request scope. This can cause unexpected runtime errors.`,
      );
    }
  }
}
