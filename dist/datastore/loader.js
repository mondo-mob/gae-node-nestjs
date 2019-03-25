"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const datastore_1 = require("@google-cloud/datastore");
const entity_1 = require("@google-cloud/datastore/build/src/entity");
const trace = require("@google-cloud/trace-agent");
const DataLoader = require("dataloader");
const _ = require("lodash");
const logging_1 = require("../gcloud/logging");
const types_1 = require("../util/types");
const filters_1 = require("./filters");
const keysEqual = (key1, key2) => {
    return _.isEqual(key1.path, key2.path);
};
const countEntities = (keys) => {
    const result = keys.reduce((prev, current) => {
        if (!prev[current.kind]) {
            prev[current.kind] = 1;
        }
        else {
            prev[current.kind] += 1;
        }
        return prev;
    }, {});
    return Object.entries(result)
        .map(([entry, value]) => `${entry}: ${value} entities`)
        .join(', ');
};
function isTransaction(datastore) {
    return datastore.commit !== undefined;
}
class DatastoreLoader {
    constructor(datastore, context) {
        this.load = async (keys) => {
            const span = trace.get().createChildSpan({
                name: 'load-keys',
            });
            const prettyPrint = countEntities(keys);
            span.addLabel('entities', prettyPrint);
            const [results] = await this.datastore.get(keys);
            span.endSpan();
            this.logger.debug('Fetched entities by key ', { entities: prettyPrint });
            return keys.map(key => results.find((result) => keysEqual(result[datastore_1.Datastore.KEY], key)));
        };
        this.datastore = datastore;
        this.loader = new DataLoader(this.load, {
            cacheKeyFn: (key) => key.path.join(':'),
        });
        this.parentContext = context;
        this.logger = logging_1.createLogger('loader');
    }
    async get(id) {
        return await this.loader.loadMany(id);
    }
    async save(entities) {
        await this.applyBatched(entities, (datastore, chunk) => datastore.save(chunk), (loader, { key, data }) => loader.prime(key, data));
    }
    async delete(entities) {
        await this.applyBatched(entities, (datastore, chunk) => datastore.delete(chunk), (loader, key) => loader.clear(key));
    }
    async update(entities) {
        await this.applyBatched(entities, (datastore, chunk) => datastore.save(chunk), (loader, { key, data }) => loader.prime(key, data));
    }
    async upsert(entities) {
        await this.applyBatched(entities, (datastore, chunk) => datastore.upsert(chunk), (loader, { key, data }) => loader.prime(key, data));
    }
    async insert(entities) {
        await this.applyBatched(entities, (datastore, chunk) => datastore.insert(chunk), (loader, { key, data }) => loader.prime(key, data));
    }
    async executeQuery(kind, options) {
        let query = this.datastore.createQuery(kind);
        if (options.select) {
            query = query.select(types_1.asArray(options.select));
        }
        if (options.filters) {
            query = filters_1.buildFilters(query, options.filters);
        }
        if (options.sort) {
            query.order(options.sort.property, options.sort.options);
        }
        if (options.groupBy) {
            query.groupBy(types_1.asArray(options.groupBy));
        }
        if (options.start) {
            query.start(options.start);
        }
        if (options.end) {
            query.end(options.end);
        }
        if (options.hasAnscestor) {
            query.hasAncestor(options.hasAnscestor);
        }
        if (options.limit) {
            query.limit(options.limit);
        }
        if (options.offset) {
            query.offset(options.offset);
        }
        const [results, queryInfo] = await query.run();
        results.forEach((result) => {
            this.loader.prime(result[datastore_1.Datastore.KEY], _.omit(result, datastore_1.Datastore.KEY));
        });
        return [results, queryInfo];
    }
    async inTransaction(callback) {
        if (isTransaction(this.datastore)) {
            return await callback(Object.assign({}, this.parentContext, { datastore: this }));
        }
        else {
            const transaction = this.datastore.transaction();
            await transaction.run();
            try {
                const result = await callback(Object.assign({}, this.parentContext, { datastore: new DatastoreLoader(transaction, this.parentContext) }));
                await transaction.commit();
                return result;
            }
            catch (ex) {
                this.logger.error('Rolling back transaction - error encountered', ex);
                await transaction.rollback();
                throw ex;
            }
        }
    }
    async applyBatched(values, operation, updateLoader, batchSize = 100) {
        const entityChunks = _.chunk(values, batchSize);
        const pendingModifications = entityChunks.map((chunk) => operation(this.datastore, chunk));
        await Promise.all(pendingModifications);
        values.forEach(value => updateLoader(this.loader, value));
    }
}
exports.DatastoreLoader = DatastoreLoader;
//# sourceMappingURL=loader.js.map