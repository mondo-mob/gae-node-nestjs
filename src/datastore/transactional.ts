// tslint:disable:only-arrow-functions

import { Context } from './context';

type WithContext = (context: Context, ...args: any[]) => Promise<any>;

/**
 * Run block of code within a transaction
 */
export function Transactional() {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<WithContext>,
  ): TypedPropertyDescriptor<WithContext> {
    const value = descriptor.value!;

    descriptor.value = async function (context, ...args) {
      return await context.datastore.inTransaction(async tx => await value.apply(this, [tx, ...args]));
    };

    return descriptor;
  };
}
