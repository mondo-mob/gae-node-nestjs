"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const node_fetch_1 = require("node-fetch");
const __1 = require("..");
let SearchService = class SearchService {
    constructor(configuration) {
        this.configuration = configuration;
        this.logger = __1.createLogger('search-service');
    }
    index(entityName, entries) {
        this.logger.info(`Indexing ${entries.length} ${entityName} entities`);
        return this.post('/index', {
            entityName,
            entries,
        });
    }
    deleteAll(entityName) {
        return this.post('/deleteAll', {
            entityName,
        });
    }
    async query(entityName, fields, sort) {
        const resp = await this.post('/query', {
            entityName,
            fields: this.normaliseFields(fields),
            sort,
        });
        const ids = await resp.json();
        this.logger.info(`Query returned ${ids.length} ids`);
        return ids;
    }
    post(path, body) {
        if (!this.configuration.searchServiceEndpoint) {
            throw new Error('searchServiceEndpoint must be configured in order to use the SearchService');
        }
        return node_fetch_1.default(this.configuration.searchServiceEndpoint + path, {
            method: 'POST',
            body: JSON.stringify(body),
        });
    }
    normaliseFields(fields) {
        return Object.keys(fields).reduce((result, key) => {
            result[key] = this.toPredicate(fields[key]);
            return result;
        }, {});
    }
    toPredicate(input) {
        if (input.op !== undefined) {
            return input;
        }
        return {
            op: '=',
            value: input,
        };
    }
};
SearchService = tslib_1.__decorate([
    common_1.Injectable(),
    tslib_1.__param(0, common_1.Inject(__1.CONFIGURATION)),
    tslib_1.__metadata("design:paramtypes", [Object])
], SearchService);
exports.SearchService = SearchService;
//# sourceMappingURL=search.service.js.map