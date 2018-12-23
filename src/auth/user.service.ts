import { Context, IUser, IUserInput } from "..";

export const USER_SERVICE = "UserService";

export interface UserService<T extends IUser> {
  get(context: Context, userId: string): Promise<T | undefined>;
  create(context: Context, user: IUserInput): Promise<T>;
}
