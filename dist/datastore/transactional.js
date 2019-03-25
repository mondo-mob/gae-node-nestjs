"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function Transactional() {
    return function (target, propertyKey, descriptor) {
        const value = descriptor.value;
        descriptor.value = async function (context, ...args) {
            return await context.datastore.inTransaction(async (tx) => await value.apply(this, [tx, ...args]));
        };
        return descriptor;
    };
}
exports.Transactional = Transactional;
//# sourceMappingURL=transactional.js.map