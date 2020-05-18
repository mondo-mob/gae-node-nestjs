import { getNamespace, Namespace } from 'cls-hooked';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { RequestScopeMiddleware } from './request-scope.middleware';

export const _REQUEST_STORAGE_NAMESPACE_KEY = '_GAE_NODE_NESTJS_REQUEST_STORAGE';

export class NoNamespaceException extends Error {
  constructor(message?: string) {
    super(message || 'No active context namespace exists');
  }
}

export class InvaidKeyException extends Error {
  constructor(key: string) {
    super(`No request scoped value exists for key: ${key}`);
  }
}

const getActiveContextOptional = (): Namespace | null => {
  // Disabling means we can short-circuit any cls-hooked checks to avoid performance hits
  if (RequestScopeMiddleware.isDisabled()) {
    return null;
  }

  const context = getNamespace(_REQUEST_STORAGE_NAMESPACE_KEY);

  if (!context || !context.active) {
    return null;
  }
  return context;
};

const getActiveContext = (): Namespace => {
  const context = getActiveContextOptional();

  if (!context) {
    throw new NoNamespaceException();
  }
  return context;
};

const getValueFromContext = <T>(context: Namespace, key: string): T => {
  const value = context.get(key);
  return isNil(value) ? null : value;
};

export const isRequestScopeEnabled = (): boolean => {
  return getActiveContextOptional() !== null;
};

/**
 * A safe way to attempt to get a value from request scope or return the default. The default value
 * will be returned in one of two scenarios: when the namespace is not setup; or when the namespace
 * does not contain a non-null value for the given key.
 *
 * @param key key to retrieve value for from request scope namespace
 * @param defaultVal default value when request scope namespace is not active, or when there is no value in namespace
 */
export const getRequestScopeValueOrDefault = <T>(key: string, defaultVal: T): T => {
  const context = getActiveContextOptional();

  if (context) {
    const value = getValueFromContext<T>(context, key);
    if (!isNil(value)) {
      return value;
    }
  }
  return defaultVal;
};

export const getRequestScopeValue = <T>(key: string): T | null => {
  const context = getActiveContext();
  return getValueFromContext(context, key);
};

export const getRequestScopeValueRequired = <T>(key: string): T => {
  const nullable = getRequestScopeValue<T>(key);
  if (nullable === null) {
    throw new InvaidKeyException(key);
  }
  return nullable;
};

export const setRequestScopeValue = <T>(key: string, value: T): T => {
  const context = getActiveContext();
  context.set(key, value);
  return value;
};

export const clearRequestScopeValue = (key: string) => {
  const context = getActiveContext();
  context.set(key, null);
};
