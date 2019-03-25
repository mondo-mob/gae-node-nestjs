"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const common_1 = require("@nestjs/common");
const path = require("path");
let NotFoundFilter = class NotFoundFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        if (request.headers.accept &&
            request.headers.accept.includes('text/html')) {
            return response
                .status(200)
                .sendFile(path.join(process.cwd(), 'public', 'index.html'));
        }
        response.status(404).json({
            statusCode: exception.getStatus(),
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
};
NotFoundFilter = tslib_1.__decorate([
    common_1.Catch(common_1.NotFoundException)
], NotFoundFilter);
exports.NotFoundFilter = NotFoundFilter;
//# sourceMappingURL=filter.js.map