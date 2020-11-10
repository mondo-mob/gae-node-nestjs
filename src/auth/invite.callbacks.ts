import { IUser } from '..';

export const INVITE_CALLBACKS = 'InviteCallbacks';

export interface InviteCallbacks<U extends IUser> {
  afterInvite?(user: U, inviteId: string): void | Promise<void>;
  afterActivate?(user: U): void | Promise<void>;
}
