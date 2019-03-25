"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const csp = require("helmet-csp");
const csrf_interceptor_1 = require("./auth/csrf.interceptor");
const logging_1 = require("./gcloud/logging");
const types_1 = require("./util/types");
exports.configureExpress = (expressApp, options) => {
    expressApp.use(csp(options.csp || {
        directives: {
            defaultSrc: ["'none'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'"],
            connectSrc: ["'self'", 'https://www.googleapis.com'],
        },
    }));
    let secure = (options.session.cookie && options.session.cookie.secure) || false;
    if (process.env.NODE_ENV === 'production' && process.env.APP_ENGINE_ENVIRONMENT) {
        expressApp.set('trust proxy', true);
        secure = true;
        logging_1.rootLogger.info('Cookie secured for prod');
    }
    const { ignorePaths = [/^\/(tasks\/|system\/).*/] } = options.csrf || {};
    const unless = (exclusions, middleware) => {
        return (req, res, next) => {
            const matchesExclusion = types_1.asArray(exclusions).some(path => typeof path.test === 'function' ? path.test(req.path) : path === req.path);
            matchesExclusion ? next() : middleware(req, res, next);
        };
    };
    expressApp.use(unless(ignorePaths, csrf_interceptor_1.CsrfValidator));
};
//# sourceMappingURL=configure.js.map