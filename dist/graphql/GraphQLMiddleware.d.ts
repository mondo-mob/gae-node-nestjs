import { MiddlewareFunction, NestMiddleware } from '@nestjs/common';
import { GraphQLFactory } from '@nestjs/graphql';
export declare class GraphQLMiddleware implements NestMiddleware {
    private readonly graphqlFactory;
    constructor(graphqlFactory: GraphQLFactory);
    private generateSchema;
    resolve(...args: any[]): MiddlewareFunction;
}
