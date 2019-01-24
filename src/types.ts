import * as iots from 'io-ts';
import { Mixed } from 'io-ts';

export const t = {
  ...iots,
  nullable: (type: Mixed) => t.union([type, t.undefined]),
};
