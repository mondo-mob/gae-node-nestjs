"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../util/types");
function isComplexFilter(filter) {
    return filter.op !== undefined;
}
exports.isComplexFilter = isComplexFilter;
exports.buildFilters = (query, filters, pathPrefix = '') => {
    return Object
        .entries(filters)
        .reduce((q, [key, value]) => {
        if (!isComplexFilter(value) && typeof value === 'object' && !Array.isArray(value)) {
            return exports.buildFilters(query, value, pathPrefix + `${key}.`);
        }
        const parameterFilters = types_1.asArray(value);
        for (const filter of parameterFilters) {
            if (isComplexFilter(filter)) {
                q = q.filter(pathPrefix + key, filter.op, filter.value);
            }
            else {
                q = q.filter(pathPrefix + key, filter);
            }
        }
        return q;
    }, query);
};
//# sourceMappingURL=filters.js.map