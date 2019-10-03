import { Injectable } from '@nestjs/common';
import * as t from 'io-ts';
import { Repository } from '../../datastore/repository';
import { DatastoreProvider } from '../../datastore/datastore.provider';

const storedCredential = t.interface({
  id: t.string, // credential name
  value: t.string,
});

export type StoredCredential = t.TypeOf<typeof storedCredential>;

@Injectable()
export class StoredCredentialsRepository extends Repository<StoredCredential> {
  constructor(datastore: DatastoreProvider) {
    super(datastore.datastore, 'StoredCredential', storedCredential, {});
  }
}
