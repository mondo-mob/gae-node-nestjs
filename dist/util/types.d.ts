export declare type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export declare type OneOrMany<T> = T | ReadonlyArray<T>;
export declare const asArray: <T>(input: OneOrMany<T>) => any[];
