"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unique = (src, ...newValues) => {
    const set = new Set(src);
    newValues.forEach(val => set.add(val));
    return Array.from(set);
};
//# sourceMappingURL=arrays.js.map