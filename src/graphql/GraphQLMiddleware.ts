import {Injectable, MiddlewareFunction, NestMiddleware} from '@nestjs/common';
import {GraphQLFactory} from '@nestjs/graphql';
import {graphqlExpress} from 'apollo-server-express';
import {GraphQLDateTime, GraphQLTime} from 'graphql-iso-date';
import {GraphQLUpload} from 'apollo-upload-server';
import * as _ from 'lodash';
import {fileLoader, mergeTypes} from 'merge-graphql-schemas';
import {rootLogger} from '../index';

@Injectable()
export class GraphQLMiddleware implements NestMiddleware {
  constructor(private readonly graphqlFactory: GraphQLFactory) {
  }

  private generateSchema = () => {
    const appTypeDefs = fileLoader('./src/**/*.graphqls');
    const libTypeDefs = fileLoader(
      './node_modules/@3wks/gae-node-nestjs/dist/**/*.graphqls',
    );

    const typeDefs = mergeTypes([...appTypeDefs, ...libTypeDefs]);

    return this.graphqlFactory.createSchema({
      typeDefs,
      resolvers: {
        Time: GraphQLTime,
        DateAndTime: GraphQLDateTime,
        Upload: GraphQLUpload,
      },
      logger: {
        log: payload => {
          if (typeof payload === 'string') {
            rootLogger.info(payload);
          } else {
            rootLogger.error(payload);
          }
        },
      },
    });
  };

  resolve(...args: any[]): MiddlewareFunction {
    const schema = this.generateSchema();
    return graphqlExpress(async req => {
      return {
        schema,
        rootValue: req,
        context: _.get(req, 'context'),
      };
    })
  }

}
