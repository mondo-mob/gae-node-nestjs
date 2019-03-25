"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const iots = require("io-ts");
tslib_1.__exportStar(require("io-ts"), exports);
exports.nullable = (type) => iots.union([type, iots.null]);
//# sourceMappingURL=types.js.map