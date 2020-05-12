import {
  _REQUEST_STORAGE_NAMESPACE_KEY,
  clearRequestScopeValue,
  getRequestScopeValue,
  getRequestScopeValueRequired,
  setRequestScopeValue,
} from './request-scope';
import { createNamespace, reset } from 'cls-hooked';

describe('Request Scope', () => {
  beforeEach(() => {
    reset();
  });
  afterEach(() => {
    reset();
  });

  describe('getRequestScopeValue', () => {
    it('throws exception when no namespace exists', () => {
      expect(() => getRequestScopeValue('anything')).toThrowError('No active context namespace exists');
    });

    it('throws exception when inactive namespace exists', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY);
      expect(() => getRequestScopeValue('anything')).toThrowError('No active context namespace exists');
    });

    it('returns null when active namespace exists with no value for key', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => {
        expect(getRequestScopeValue('does-not-exist')).toBeNull();
      });
    });

    it('returns typed value when value has been set', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => {
        setRequestScopeValue('my-key', 99);

        const value: number | null = getRequestScopeValue('my-key');

        expect(value).toBe(99);
      });
    });

    it('returns typed value when value has been set to falsy value', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => {
        setRequestScopeValue('my-key', 0);

        const value: number | null = getRequestScopeValue('my-key');

        expect(value).toBe(0);
      });
    });
  });

  describe('getRequestScopeValueRequired', () => {
    it('throws exception when active namespace exists with no value for key', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => {
        expect(() => getRequestScopeValueRequired('does-not-exist')).toThrowError(
          'No request scoped value exists for key: does-not-exist',
        );
      });
    });

    it('returns typed value when value has been set', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => {
        setRequestScopeValue('my-key', 99);

        const value: number = getRequestScopeValueRequired('my-key');

        expect(value).toBe(99);
      });
    });

    it('returns typed value when value is falsy but not null', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => {
        setRequestScopeValue('my-key', 0);

        const value: number = getRequestScopeValueRequired('my-key');

        expect(value).toBe(0);
      });
    });
  });

  describe('clearRequestScopedValue', () => {
    it('clears existing request scoped value for key', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => {
        setRequestScopeValue('my-key', 0);

        clearRequestScopeValue('my-key');

        expect(getRequestScopeValue('my-key')).toBeNull();
      });
    });

    it('has no effect when value has not been set already', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => {
        clearRequestScopeValue('my-key');

        expect(getRequestScopeValue('my-key')).toBeNull();
      });
    });

    it('throws exception when no namespace exists', () => {
      expect(() => clearRequestScopeValue('anything')).toThrowError('No active context namespace exists');
    });

    it('throws exception when inactive namespace exists', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY);
      expect(() => clearRequestScopeValue('anything')).toThrowError('No active context namespace exists');
    });
  });
});
