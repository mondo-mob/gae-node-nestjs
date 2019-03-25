"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const repository_1 = require("../datastore/repository");
const types_1 = require("../util/types");
class SearchableRepository extends repository_1.Repository {
    constructor(datastore, searchService, kind, validator, options) {
        super(datastore, kind, validator, options);
        this.searchService = searchService;
        this.options = options;
    }
    async save(context, entities) {
        const savedEntities = await super.save(context, entities);
        await this.index(savedEntities);
        return savedEntities;
    }
    async update(context, entities) {
        const savedEntities = await super.update(context, entities);
        await this.index(savedEntities);
        return savedEntities;
    }
    async insert(context, entities) {
        const savedEntities = await super.insert(context, entities);
        await this.index(savedEntities);
        return savedEntities;
    }
    async upsert(context, entities) {
        const savedEntities = await super.upsert(context, entities);
        await this.index(savedEntities);
        return savedEntities;
    }
    async search(context, searchFields, sort) {
        const ids = await this.searchService.query(this.kind, searchFields, sort);
        const requests = await this.get(context, ids);
        return requests;
    }
    index(entities) {
        const entitiesArr = types_1.asArray(entities);
        const entries = entitiesArr.map(entity => {
            const fields = Object.keys(this.options.searchIndex).reduce((obj, fieldName) => {
                obj[fieldName] = entity[fieldName];
                return obj;
            }, {});
            return {
                id: entity.id,
                fields,
            };
        });
        return this.searchService.index(this.kind, entries);
    }
}
exports.SearchableRepository = SearchableRepository;
//# sourceMappingURL=searchable.repository.js.map