import { Injectable } from '@nestjs/common';
import * as t from 'io-ts';
import { normaliseEmail } from '..';
import { DatastoreProvider } from '../datastore/datastore.provider';
import { dateType, Repository } from '../datastore/repository';
import { asArray, OneOrMany } from '../util/types';

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
    super(datastoreProvider.datastore, 'UserInvite', userInvite, {
      index: {
        userId: true,
      },
    });
  }
}

const externalAuthTypeEnum = t.union([t.literal('google'), t.literal('saml'), t.literal('auth0'), t.literal('oidc')]);

const loginCredentials = t.clean(
  t.union([
    t.interface({
      id: t.string, // username/email
      userId: t.string,
      password: t.string,
      type: t.literal('password'),
    }),
    t.interface({
      id: t.string, // username/email
      userId: t.string,
      type: externalAuthTypeEnum,
    }),
  ]),
);

export type LoginCredentials = t.TypeOf<typeof loginCredentials>;
export type ExternalAuthType = t.TypeOf<typeof externalAuthTypeEnum>;

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

  protected beforePersist(entities: OneOrMany<LoginCredentials>): OneOrMany<LoginCredentials> {
    return asArray(entities)
      .map(entity => ({
        ...entity,
        id: normaliseEmail(entity.id),
      }));
  }

}
