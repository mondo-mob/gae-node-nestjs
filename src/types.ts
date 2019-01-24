import * as iots from 'io-ts';
import { Mixed } from 'io-ts';

export const t = {
  ...iots,
  nullable: <T>(type: iots.Type<T>) => t.union([type, t.null]),
};
