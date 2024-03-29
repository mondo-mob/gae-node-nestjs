import { CloudTasksClient } from '@google-cloud/tasks';
import fetch from 'node-fetch';
import { Configuration, Logger } from '../';
import { createLogger } from './logging';

export class TaskQueue<T extends Configuration> {
  private taskLogger: Logger;

  constructor(protected readonly configurationProvider: T, private readonly queueName: string) {
    this.taskLogger = createLogger('task-queue');
  }

  async enqueue(taskName: string, payload: any = {}, inSeconds?: number) {
    if (this.configurationProvider.environment === 'development') {
      await this.localQueue(taskName, payload);
    } else {
      await this.appEngineQueue(taskName, payload, inSeconds);
    }
  }

  async appEngineQueue(taskName: string, payload: any = {}, inSeconds?: number) {
    const client = new CloudTasksClient();

    const projectId = this.configurationProvider.projectId;
    const location = this.configurationProvider.location;
    const serviceTasksOnThisVersion = !!this.configurationProvider.serviceTasksOnThisVersion;

    const body = JSON.stringify(payload);
    const requestPayload = Buffer.from(body).toString('base64');

    const parent = client.queuePath(projectId, location, this.queueName);

    const task = {
      appEngineHttpRequest: {
        relativeUri: `/tasks/${taskName}`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestPayload,
        // will go to version taking traffic if not specified - enables testing offline
        ...(serviceTasksOnThisVersion
          ? {
              appEngineRouting: {
                version: process.env.GAE_VERSION,
              },
            }
          : {}),
      },
      ...(inSeconds
        ? {
            scheduleTime: {
              seconds: inSeconds + Date.now() / 1000,
            },
          }
        : {}),
    };

    this.taskLogger.info('Creating task with payload: ', task);
    await client.createTask({
      parent,
      task,
    });
  }

  async localQueue(taskName: string, payload: any = {}) {
    const endpoint = `${this.configurationProvider.host}/tasks/${taskName}`;
    this.taskLogger.info(`Dispatching local task to ${endpoint}`);

    // Intentionally don't return this promise because we want the task to be executed
    // asynchronously - i.e. a tiny bit like a task queue would work. Otherwise if the caller
    // awaits this fetch then it will wait for the entire downstream process to complete.
    fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
        'x-appengine-taskname': taskName,
      },
    }).then(async result => {
      if (!result.ok) {
        throw new Error(`Task failed to execute - status ${result.status}: ${await result.text()}`);
      }
    });
  }
}
