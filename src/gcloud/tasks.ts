import * as Logger from 'bunyan';
import { google, cloudtasks_v2beta2 } from 'googleapis';
import fetch from 'node-fetch';
import { Configuration } from '../';
import { createLogger } from './logging';

const cloudtasks = google.cloudtasks('v2beta2');
const tasks = cloudtasks.projects.locations.queues
  .tasks as cloudtasks_v2beta2.Resource$Projects$Locations$Queues$Tasks;

export class TaskQueue<T extends Configuration> {
  private taskLogger: Logger;

  constructor(
    protected readonly configurationProvider: T,
    private readonly queueName: string,
  ) {
    this.taskLogger = createLogger('task-queue');
  }

  async enqueue(taskName: string, payload: any) {
    if (this.configurationProvider.environment === 'development') {
      await this.localQueue(taskName, payload);
    } else {
      await this.appEngineQueue(taskName, payload);
    }
  }

  async appEngineQueue(taskName: string, payload: any) {
    const client = await google.auth.getClient({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const projectId = this.configurationProvider.projectId;
    const location = this.configurationProvider.location;

    const body = JSON.stringify(payload);
    const requestPayload = Buffer.from(body).toString('base64');
    await tasks.create(
      {
        auth: client,
        parent: `projects/${projectId}/locations/${location}/queues/${
          this.queueName
        }`,
        requestBody: {
          task: {
            appEngineHttpRequest: {
              relativeUrl: `/tasks/${taskName}`,
              headers: {
                'Content-Type': 'application/json',
              },
              payload: requestPayload,
              httpMethod: 'POST',
            },
          },
        },
      },
      {},
    );
  }

  async localQueue(taskName: string, payload: any) {
    const endpoint = `${this.configurationProvider.host}/tasks/${taskName}`;
    this.taskLogger.info(`Dispatching local task to ${endpoint}`);

    const result = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
        'x-appengine-taskname': taskName,
      },
    });

    if (!result.ok) {
      throw new Error(
        `Task failed to execute - status ${
          result.status
        }: ${await result.text()}`,
      );
    }
  }
}
