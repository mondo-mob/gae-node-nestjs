"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tasks_1 = require("@google-cloud/tasks");
const node_fetch_1 = require("node-fetch");
const logging_1 = require("./logging");
class TaskQueue {
    constructor(configurationProvider, queueName) {
        this.configurationProvider = configurationProvider;
        this.queueName = queueName;
        this.taskLogger = logging_1.createLogger('task-queue');
    }
    async enqueue(taskName, payload = {}) {
        if (this.configurationProvider.environment === 'development') {
            await this.localQueue(taskName, payload);
        }
        else {
            await this.appEngineQueue(taskName, payload);
        }
    }
    async appEngineQueue(taskName, payload = {}) {
        const client = new tasks_1.default.v2beta3.CloudTasksClient();
        const projectId = this.configurationProvider.projectId;
        const location = this.configurationProvider.location;
        const body = JSON.stringify(payload);
        const requestPayload = Buffer.from(body).toString('base64');
        const parent = `projects/${projectId}/locations/${location}/queues/${this.queueName}`;
        const task = {
            appEngineHttpRequest: {
                relativeUri: `/tasks/${taskName}`,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: requestPayload,
                httpMethod: 'POST',
            },
        };
        await client.createTask({
            parent,
            task,
        });
    }
    async localQueue(taskName, payload = {}) {
        const endpoint = `${this.configurationProvider.host}/tasks/${taskName}`;
        this.taskLogger.info(`Dispatching local task to ${endpoint}`);
        const result = await node_fetch_1.default(endpoint, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'content-type': 'application/json',
                'x-appengine-taskname': taskName,
            },
        });
        if (!result.ok) {
            throw new Error(`Task failed to execute - status ${result.status}: ${await result.text()}`);
        }
    }
}
exports.TaskQueue = TaskQueue;
//# sourceMappingURL=tasks.js.map