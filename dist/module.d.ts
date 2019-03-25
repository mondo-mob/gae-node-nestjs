import { ForwardReference, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { GraphQLMiddleware } from './graphql/GraphQLMiddleware';
interface ClassType {
    new (...args: any[]): any;
}
declare type ClassTypeOrReference = ClassType | ForwardReference<any>;
export interface Options {
    configurationModule: ClassTypeOrReference;
    userModule: ClassTypeOrReference;
}
export declare class GCloudModule implements NestModule {
    private readonly graphqlConfigurer;
    constructor(graphqlConfigurer: GraphQLMiddleware);
    configure(consumer: MiddlewareConsumer): void;
    static forConfiguration(options: Options): {
        module: typeof GCloudModule;
        imports: ClassTypeOrReference[];
    };
}
export {};
