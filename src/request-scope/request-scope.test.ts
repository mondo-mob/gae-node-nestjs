import {
  clearRequestScopeValue,
  getRequestScopeValueOrDefault,
  getRequestScopeValue,
  getRequestScopeValueRequired,
  isRequestScopeEnabled,
  setRequestScopeValue,
} from './request-scope';
import { requestScopeStorage } from './request-scope-storage';
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
  });

  describe('getRequestScopeValue', () => {
    it('returns typed value when value has been set', () => {
      requestScopeStorage.run(new Map(), () => {
        setRequestScopeValue('my-key', 99);

        const value: number | null = getRequestScopeValue('my-key');

        expect(value).toBe(99);
      });
    });

    it('returns typed value when value has been set to falsy value', () => {
      requestScopeStorage.run(new Map(), () => {
        setRequestScopeValue('my-key', 0);

        const value: number | null = getRequestScopeValue('my-key');

        expect(value).toBe(0);
      });
    });

    it('returns null when in a request scope with no value for key', () => {
      requestScopeStorage.run(new Map(), () => {
        expect(getRequestScopeValue('does-not-exist')).toBeNull();
      });
    });

    it('throws exception when middleware created without request scope enabled', () => {
      requestScopeMiddleware(false);

      requestScopeStorage.run(new Map(), () => {
        expect(() => getRequestScopeValue('anything')).toThrowError('No active context namespace exists');
      });
    });

    it('throws exception when called outside a request scope', () => {
      expect(() => getRequestScopeValue('anything')).toThrowError('No active context namespace exists');
    });
  });

  describe('async propagation', () => {
    it('keeps the value across await and timers within the same request', async () => {
      await requestScopeStorage.run(new Map(), async () => {
        setRequestScopeValue('my-key', 'request-1');

        await Promise.resolve();
        expect(getRequestScopeValue('my-key')).toBe('request-1');

        await new Promise<void>(resolve => setTimeout(resolve, 5));
        expect(getRequestScopeValue('my-key')).toBe('request-1');
      });
    });

    it('does not leak values between concurrent requests', async () => {
      const request = (id: string, delayMs: number) =>
        requestScopeStorage.run(new Map(), async () => {
          setRequestScopeValue('my-key', id);
          await new Promise<void>(resolve => setTimeout(resolve, delayMs));
          return getRequestScopeValue<string>('my-key');
        });

      const results = await Promise.all([request('a', 15), request('b', 5), request('c', 10)]);

      expect(results).toEqual(['a', 'b', 'c']);
    });

    it('has no value once the request has finished', async () => {
      await requestScopeStorage.run(new Map(), async () => setRequestScopeValue('my-key', 'done'));

      expect(() => getRequestScopeValue('my-key')).toThrowError('No active context namespace exists');
    });
  });

  describe('getRequestScopeValueRequired', () => {
    it('throws exception when in a request scope with no value for key', () => {
      requestScopeStorage.run(new Map(), () => {
        expect(() => getRequestScopeValueRequired('does-not-exist')).toThrowError(
          'No request scoped value exists for key: does-not-exist',
        );
      });
    });

    it('returns typed value when value has been set', () => {
      requestScopeStorage.run(new Map(), () => {
        setRequestScopeValue('my-key', 99);

        const value: number = getRequestScopeValueRequired('my-key');

        expect(value).toBe(99);
      });
    });

    it('returns typed value when value is falsy but not null', () => {
      requestScopeStorage.run(new Map(), () => {
        setRequestScopeValue('my-key', 0);

        const value: number = getRequestScopeValueRequired('my-key');

        expect(value).toBe(0);
      });
    });
  });

  describe('clearRequestScopedValue', () => {
    it('clears existing request scoped value for key', () => {
      requestScopeStorage.run(new Map(), () => {
        setRequestScopeValue('my-key', 0);

        clearRequestScopeValue('my-key');

        expect(getRequestScopeValue('my-key')).toBeNull();
      });
    });

    it('has no effect when value has not been set already', () => {
      requestScopeStorage.run(new Map(), () => {
        clearRequestScopeValue('my-key');

        expect(getRequestScopeValue('my-key')).toBeNull();
      });
    });

    it('throws exception when called outside a request scope', () => {
      expect(() => clearRequestScopeValue('anything')).toThrowError('No active context namespace exists');
    });
  });

  describe('isRequestScopeEnabled', () => {
    it('returns false when called outside a request scope', () => {
      expect(isRequestScopeEnabled()).toBe(false);
    });
    it('returns true when request scope setup and this is called within scope', () => {
      requestScopeStorage.run(new Map(), () => expect(isRequestScopeEnabled()).toBe(true));
    });
  });

  describe('getRequestScopeValueOrDefault', () => {
    it('returns default when called outside a request scope', () => {
      expect(getRequestScopeValueOrDefault('my-key', 'my-default')).toBe('my-default');
    });
    it('returns default when request scope setup and value not set', () => {
      requestScopeStorage.run(new Map(), () =>
        expect(getRequestScopeValueOrDefault('my-key', 'my-default')).toBe('my-default'),
      );
    });
    it('returns value when request scope setup and value IS set', () => {
      requestScopeStorage.run(new Map(), () => {
        setRequestScopeValue('my-key', 'my-value');
        expect(getRequestScopeValueOrDefault('my-key', 'my-default')).toBe('my-value');
      });
    });
  });
});
