"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const apollo_server_express_1 = require("apollo-server-express");
const graphql_iso_date_1 = require("graphql-iso-date");
const _ = require("lodash");
const merge_graphql_schemas_1 = require("merge-graphql-schemas");
const index_1 = require("../index");
let GraphQLMiddleware = class GraphQLMiddleware {
    constructor(graphqlFactory) {
        this.graphqlFactory = graphqlFactory;
        this.generateSchema = () => {
            const appTypeDefs = merge_graphql_schemas_1.fileLoader('./src/**/*.graphqls');
            const libTypeDefs = merge_graphql_schemas_1.fileLoader('./node_modules/@3wks/gae-node-nestjs/dist/**/*.graphqls');
            const typeDefs = merge_graphql_schemas_1.mergeTypes([...appTypeDefs, ...libTypeDefs]);
            return this.graphqlFactory.createSchema({
                typeDefs,
                resolvers: {
                    Time: graphql_iso_date_1.GraphQLTime,
                    DateAndTime: graphql_iso_date_1.GraphQLDateTime,
                },
                logger: {
                    log: payload => {
                        if (typeof payload === 'string') {
                            index_1.rootLogger.info(payload);
                        }
                        else {
                            index_1.rootLogger.error(payload);
                        }
                    },
                },
            });
        };
    }
    resolve(...args) {
        const schema = this.generateSchema();
        return apollo_server_express_1.graphqlExpress(async (req) => {
            return {
                schema,
                rootValue: req,
                context: _.get(req, 'context'),
            };
        });
    }
};
GraphQLMiddleware = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__metadata("design:paramtypes", [graphql_1.GraphQLFactory])
], GraphQLMiddleware);
exports.GraphQLMiddleware = GraphQLMiddleware;
//# sourceMappingURL=GraphQLMiddleware.js.map