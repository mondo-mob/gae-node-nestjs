import { Context, IUser } from '../datastore/context';

export const INVITE_CALLBACKS = 'InviteCallbacks';

export interface InviteCallbacks<U extends IUser> {
  afterInvite?(context: Context, user: U, inviteId: string): void | Promise<void>;
  afterActivate?(context: Context, user: U): void | Promise<void>;
}
