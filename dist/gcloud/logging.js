"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logging_bunyan_1 = require("@google-cloud/logging-bunyan");
const Logger = require("bunyan");
let streams = [
    {
        stream: process.stdout,
    },
];
if (process.env.APP_ENGINE_ENVIRONMENT) {
    const loggingBunyan = new logging_bunyan_1.LoggingBunyan();
    streams = [loggingBunyan.stream('info')];
}
exports.rootLogger = Logger.createLogger({
    name: 'service',
    level: 'info',
    streams,
});
exports.createLogger = (name) => {
    return exports.rootLogger.child({
        service: name,
    });
};
class BunyanLogger {
    log(message) {
        exports.rootLogger.info(message);
    }
    error(message, trace) {
        exports.rootLogger.error(message, { errorTrace: trace });
    }
    warn(message) {
        exports.rootLogger.warn(message);
    }
}
exports.BunyanLogger = BunyanLogger;
//# sourceMappingURL=logging.js.map