"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const datastore_1 = require("@google-cloud/datastore");
const entity_1 = require("@google-cloud/datastore/build/src/entity");
const t = require("io-ts");
const io_ts_reporters_1 = require("io-ts-reporters");
const _ = require("lodash");
const types_1 = require("../util/types");
function buildExclusions(input, schema = {}, path = '') {
    if (schema === true) {
        return [];
    }
    else if (Array.isArray(input)) {
        return _.chain(input)
            .flatMap(value => {
            return buildExclusions(value, schema, `${path}[]`);
        })
            .push(`${path}[]`)
            .uniq()
            .value();
    }
    else if (typeof input === 'object') {
        const paths = _.flatMap(input, (value, key) => {
            return buildExclusions(value, schema[key], `${path}${path.length > 0 ? '.' : ''}${key}`);
        });
        if (path) {
            paths.push(path);
        }
        return paths;
    }
    return [path];
}
exports.buildExclusions = buildExclusions;
exports.datastoreKey = new t.Type('Entity.Key', (input) => typeof input === 'object', input => t.success(input), (value) => value);
exports.dateType = new t.Type('DateType', (m) => m instanceof Date, (m, c) => (m instanceof Date ? t.success(m) : t.failure('Value is not date', c)), a => a);
class LoadError extends Error {
    constructor(kind, id, errors) {
        super(`"${kind}" with id "${id}" failed to load due to ${errors.length} errors:\n${errors.join('\n')}`);
    }
}
class SaveError extends Error {
    constructor(kind, id, errors) {
        super(`"${kind}" with id "${id}" failed to save due to ${errors.length} errors:\n${errors.join('\n')}`);
    }
}
class Repository {
    constructor(datastore, kind, validator, options = {}) {
        this.datastore = datastore;
        this.kind = kind;
        this.options = options;
        this.key = (name) => {
            return this.datastore.key([this.kind, name]);
        };
        this.validate = (id, value) => {
            const entity = Object.assign({}, this.options.defaultValues, value, { id });
            const validation = this.validator.decode(entity);
            if (validation.isLeft()) {
                const errors = io_ts_reporters_1.reporter(validation);
                throw new LoadError(this.kind, id, errors);
            }
            return validation.value;
        };
        this.validator = validator;
    }
    async getRequired(context, id) {
        const result = await this.get(context, id);
        if (!result) {
            throw new LoadError(this.kind, id, ['invalid id']);
        }
        return result;
    }
    async get(context, ids) {
        const idArray = types_1.asArray(ids);
        const allKeys = idArray.map(this.key);
        const results = await context.datastore.get(allKeys);
        const validatedResults = results.map((result, idx) => {
            if (result) {
                return this.validate(idArray[idx], result);
            }
            return result;
        });
        if (Array.isArray(ids)) {
            return validatedResults;
        }
        else {
            return validatedResults[0];
        }
    }
    async query(context, options = {}) {
        const [results, queryInfo] = await context.datastore.executeQuery(this.kind, options);
        return [
            results.map(value => this.validate(value[entity_1.entity.KEY_SYMBOL].name, _.omit(value, datastore_1.Datastore.KEY))),
            queryInfo,
        ];
    }
    async save(context, entities) {
        return this.applyMutation(context, entities, (loader, e) => loader.save(e));
    }
    async update(context, entities) {
        return this.applyMutation(context, entities, (loader, e) => loader.update(e));
    }
    async insert(context, entities) {
        return this.applyMutation(context, entities, (loader, e) => loader.insert(e));
    }
    async upsert(context, entities) {
        return this.applyMutation(context, entities, (loader, e) => loader.upsert(e));
    }
    async reindex(context, operation = input => input) {
        const [allEntities] = await this.query(context);
        const updatedEntities = await Promise.all(allEntities.map(operation));
        return this.update(context, updatedEntities);
    }
    async delete(context, ...ids) {
        const allIds = ids.map(id => this.key(id));
        await context.datastore.delete(allIds);
    }
    async deleteAll(context) {
        const [allEntities] = await this.query(context);
        const allIds = allEntities.map(value => this.key(value.id));
        await context.datastore.delete(allIds);
    }
    async applyMutation(context, entities, mutation) {
        const entitiesToSave = types_1.asArray(entities)
            .map(entity => {
            const validation = this.validator.decode(entity);
            if (validation.isLeft()) {
                const errors = io_ts_reporters_1.reporter(validation);
                throw new SaveError(this.kind, entity.id, errors);
            }
            return validation.value;
        })
            .map(data => {
            const withoutId = _.omit(data, 'id');
            return {
                key: this.key(data.id),
                data: withoutId,
                excludeFromIndexes: buildExclusions(withoutId, this.options.index),
            };
        });
        await mutation(context.datastore, entitiesToSave);
        return entities;
    }
}
exports.Repository = Repository;
//# sourceMappingURL=repository.js.map