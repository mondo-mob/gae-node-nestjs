import { Context, IUser } from '..';

export const USER_SERVICE = 'UserService';

export interface UserService {
  get(context: Context, userId: string): IUser;
  create(context: Context, user: IUser): IUser;
}
