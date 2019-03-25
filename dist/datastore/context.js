"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const loader_1 = require("./loader");
const common_1 = require("@nestjs/common");
const _ = require("lodash");
const ContextType = Symbol();
exports.Ctxt = common_1.createParamDecorator((data, req) => req.context);
function isContext(value) {
    return !!value[ContextType];
}
exports.isContext = isContext;
exports.newContext = (datastore) => {
    const context = { [ContextType]: true };
    context.datastore = new loader_1.DatastoreLoader(datastore, context);
    context.hasAnyRole = (...roles) => !!context.user && context.user.roles.some(r => _.includes(roles, r));
    return context;
};
exports.transaction = async (context, callback) => {
    return await callback(context);
};
//# sourceMappingURL=context.js.map