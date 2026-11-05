import { AsyncLocalStorage } from 'async_hooks';

/**
 * Holds the request scoped values for the current async call chain.
 *
 * This replaced cls-hooked. cls-hooked keeps a strong reference to every request's context in a global Map until each
 * async resource's destroy hook fires, and a promise's destroy hook only fires once the promise is garbage collected.
 * Anything that holds a promise and hangs off the request scope (the Datastore loader's DataLoader cache does) therefore
 * kept the whole request context alive forever. AsyncLocalStorage ties the store's lifetime to the async chain instead.
 */
export const requestScopeStorage = new AsyncLocalStorage<Map<string, unknown>>();
