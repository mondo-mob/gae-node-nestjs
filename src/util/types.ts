export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type OneOrMany<T> = T | ReadonlyArray<T>;

export const asArray = <T>(input: OneOrMany<T>): Array<T> => (Array.isArray(input) ? input : [input]) as Array<T>;

export const asPromise = <T>(src: T | Promise<T>): Promise<T> => (src instanceof Promise ? src : Promise.resolve(src));
