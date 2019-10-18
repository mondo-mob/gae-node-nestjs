export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type OneOrMany<T> = T | ReadonlyArray<T>;

export const asArray = <T>(input: OneOrMany<T>) => (Array.isArray(input) ? input : [input]);
