import { getNamespace, Namespace } from 'cls-hooked';
import { entity } from '@google-cloud/datastore/build/src/entity';
import { isNil } from '@nestjs/common/utils/shared.utils';

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

const getActiveContext = (): Namespace => {
  const context = getNamespace(_REQUEST_STORAGE_NAMESPACE_KEY);

  if (!context || !context.active) {
    throw new NoNamespaceException();
  }
  return context;
};

export const getRequestScopeValue = <T>(key: string): T | null => {
  const context = getActiveContext();
  const value = context.get(key);
  return isNil(value) ? null : value;
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
