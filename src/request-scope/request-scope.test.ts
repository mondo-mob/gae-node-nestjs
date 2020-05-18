import {
  _REQUEST_STORAGE_NAMESPACE_KEY,
  clearRequestScopeValue,
  getRequestScopeValueOrDefault,
  getRequestScopeValue,
  getRequestScopeValueRequired,
  isRequestScopeEnabled,
  setRequestScopeValue,
} from './request-scope';
import { createNamespace, reset } from 'cls-hooked';
import { RequestScopeMiddleware } from './request-scope.middleware';
import { partialInstance } from '../_test/mocks';
import { Configuration } from '../configuration';

const requestScopeMiddleware = (enabled: boolean) => {
  const config = partialInstance<Configuration>({ requestScope: { enabled } });
  return new RequestScopeMiddleware(config, []);
};

describe('Request Scope', () => {
  beforeEach(() => {
    requestScopeMiddleware(true);
    reset();
  });
  afterEach(() => {
    reset();
  });

  describe('getRequestScopeValue', () => {
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

    it('returns null when active namespace exists with no value for key', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => {
        expect(getRequestScopeValue('does-not-exist')).toBeNull();
      });
    });

    it('throws exception when middleware created without request scope enabled', () => {
      requestScopeMiddleware(false);

      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => {
        expect(() => getRequestScopeValue('anything')).toThrowError('No active context namespace exists');
      });
    });

    it('throws exception when no namespace exists', () => {
      expect(() => getRequestScopeValue('anything')).toThrowError('No active context namespace exists');
    });

    it('throws exception when inactive namespace exists', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY);
      expect(() => getRequestScopeValue('anything')).toThrowError('No active context namespace exists');
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

  describe('isRequestScopeEnabled', () => {
    it('returns false when namespace has not been created', () => {
      expect(isRequestScopeEnabled()).toBe(false);
    });
    it('returns false when namespace is not active', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY);
      expect(isRequestScopeEnabled()).toBe(false);
    });
    it('returns true when request scope setup and this is called within scope', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => expect(isRequestScopeEnabled()).toBe(true));
    });
  });

  describe('getRequestScopeValueOrDefault', () => {
    it('returns default when namespace has not been created', () => {
      expect(getRequestScopeValueOrDefault('my-key', 'my-default')).toBe('my-default');
    });
    it('returns default when namespace is not active', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY);
      expect(getRequestScopeValueOrDefault('my-key', 'my-default')).toBe('my-default');
    });
    it('returns default when request scope setup and value not set', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() =>
        expect(getRequestScopeValueOrDefault('my-key', 'my-default')).toBe('my-default'),
      );
    });
    it('returns value when request scope setup and value IS set', () => {
      createNamespace(_REQUEST_STORAGE_NAMESPACE_KEY).run(() => {
        setRequestScopeValue('my-key', 'my-value');
        expect(getRequestScopeValueOrDefault('my-key', 'my-default')).toBe('my-value');
      });
    });
  });
});
