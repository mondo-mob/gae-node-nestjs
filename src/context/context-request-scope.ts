import { RequestScopeInterceptor, setRequestScopeValue } from '../request-scope';
import { Injectable } from '@nestjs/common';
import { RequestWithContext } from './context-middleware';
import { getRequestScopeValueRequired } from '../request-scope/request-scope';
import { defaultLogger } from '../logging/logging-internal';
import { Context } from '../datastore/context';

const key = '_CONTEXT';
export const getContext = (): Context => getRequestScopeValueRequired(key);

@Injectable()
export class ContextRequestScopeInterceptor implements RequestScopeInterceptor {
  readonly name: string = 'ContextRequestScopeInterceptor';

  intercept(req: RequestWithContext): void {
    if (req.context) {
      setRequestScopeValue(key, req.context);
    } else {
      defaultLogger.warn(
        `${this.name}: Context does not exist on Request, so cannot set it within request scope. This can cause unexpected runtime errors.`,
      );
    }
  }
}
