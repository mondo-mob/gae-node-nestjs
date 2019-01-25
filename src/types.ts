import * as iots from 'io-ts';
import { Mixed } from 'io-ts';

export * from 'io-ts';
export const nullable = <T>(type: iots.Type<T>) => iots.union([type, iots.null]);
