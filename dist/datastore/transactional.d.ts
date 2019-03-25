import { Context } from './context';
declare type WithContext = (context: Context, ...args: any[]) => Promise<any>;
export declare function Transactional(): (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<WithContext>) => TypedPropertyDescriptor<WithContext>;
export {};
