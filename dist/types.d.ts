import * as iots from 'io-ts';
export * from 'io-ts';
export declare const nullable: <T>(type: iots.Type<T, T, iots.mixed>) => iots.UnionType<(iots.Type<T, T, iots.mixed> | iots.NullType)[], T | null, T | null, iots.mixed>;
