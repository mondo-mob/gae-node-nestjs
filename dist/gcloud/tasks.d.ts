import { Configuration } from '../';
export declare class TaskQueue<T extends Configuration> {
    protected readonly configurationProvider: T;
    private readonly queueName;
    private taskLogger;
    constructor(configurationProvider: T, queueName: string);
    enqueue(taskName: string, payload?: any): Promise<void>;
    appEngineQueue(taskName: string, payload?: any): Promise<void>;
    localQueue(taskName: string, payload?: any): Promise<void>;
}
