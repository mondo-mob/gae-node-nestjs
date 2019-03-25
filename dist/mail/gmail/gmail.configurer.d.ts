import { StoredCredentialsRepository } from './stored.credentials.repository';
import { Configuration, Context } from '../..';
import { DatastoreProvider } from '../../datastore/datastore.provider';
export declare class GmailConfigurer {
    private readonly storedCredentialsRepository;
    private readonly datastoreProvider;
    private readonly configuration;
    private readonly logger;
    constructor(storedCredentialsRepository: StoredCredentialsRepository, datastoreProvider: DatastoreProvider, configuration: Configuration);
    authenticate(): any;
    getCredential(context: Context): Promise<import("io-ts").TypeOfProps<{
        id: import("io-ts").StringType;
        value: import("io-ts").StringType;
    }> | undefined>;
}
