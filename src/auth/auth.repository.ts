import { Injectable } from '@nestjs/common';
import * as t from 'io-ts';
import { dateType, Repository } from '../datastore/repository';
import { DatastoreProvider } from '../datastore/datastore.provider';

const passwordReset = t.interface({
  id: t.string, // username
  accountId: t.string,
  createdAt: dateType,
});

export type PasswordReset = t.TypeOf<typeof passwordReset>;

@Injectable()
export class PasswordResetRepository extends Repository<PasswordReset> {
  constructor(datastoreProvider: DatastoreProvider) {
    super(datastoreProvider.datastore, 'PasswordReset', passwordReset, {});
  }
}

const userInvite = t.interface({
  id: t.string, // username
  email: t.string,
  createdAt: dateType,
  userId: t.string,
  roles: t.array(t.string),
});

export type UserInvite = t.TypeOf<typeof userInvite>;

@Injectable()
export class UserInviteRepository extends Repository<UserInvite> {
  constructor(datastoreProvider: DatastoreProvider) {
    super(datastoreProvider.datastore, 'UserInvite', userInvite);
  }
}

const loginCredentials = t.clean(t.union([
  t.interface({
    id: t.string, // username
    userId: t.string,
    password: t.string,
    type: t.literal('password'),
  }),
  t.interface({
    id: t.string, // username
    userId: t.string,
    type: t.literal('google'),
  }),
  t.interface({
    id: t.string, // username
    userId: t.string,
    type: t.literal('saml'),
  }),
]));

export type LoginCredentials = t.TypeOf<typeof loginCredentials>;

@Injectable()
export class CredentialRepository extends Repository<LoginCredentials> {
  constructor(datastore: DatastoreProvider) {
    super(datastore.datastore, 'LoginCredential', loginCredentials, {
      defaultValues: { type: 'password' },
      index: {
        userId: true,
      },
    });
  }
}
