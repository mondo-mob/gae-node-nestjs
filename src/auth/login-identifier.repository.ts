import { Injectable } from '@nestjs/common';
import * as t from 'io-ts';
import { dateType, Repository } from '../datastore/repository';
import { DatastoreProvider } from '../datastore/datastore.provider';

const loginIdentifier = t.interface({
  id: t.string, // username/email
  userId: t.string,
  createdAt: dateType,
});

export type LoginIdentifier = t.TypeOf<typeof loginIdentifier>;

@Injectable()
export class LoginIdentifierRepository extends Repository<LoginIdentifier> {
  constructor(datastore: DatastoreProvider) {
    super(datastore.datastore, 'LoginIdentifier', loginIdentifier, {
      index: {
        userId: true,
      },
    });
  }
}
