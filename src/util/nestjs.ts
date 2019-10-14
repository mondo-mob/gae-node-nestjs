import { ExecutionContext } from '@nestjs/common';
import { Context } from '..';
import { Request } from 'express';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';

interface RequestWithSessionAndContext extends Request {
  session: any;
  context: Context;
}

/**
 * Get HTTP request from Execution Context - either for GraphQL execution context or regular http request.
 */
export const getRequestFromExecutionContext = (context: ExecutionContext): RequestWithSessionAndContext =>
  (context.getType<GqlContextType>() === 'graphql'
    ? GqlExecutionContext.create(context).getContext<Context>().request
    : context.switchToHttp().getRequest()) as RequestWithSessionAndContext;
