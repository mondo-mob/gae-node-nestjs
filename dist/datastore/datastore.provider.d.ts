import { Datastore } from '@google-cloud/datastore';
import { Configuration } from '../';
export declare class DatastoreProvider {
    private readonly datastoreConnection;
    private readonly logger;
    constructor(configuration: Configuration);
    readonly datastore: Datastore;
}
