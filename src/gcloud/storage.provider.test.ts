import { Storage } from '@google-cloud/storage';
import { Configuration } from '../configuration';
import { StorageProvider } from './storage.provider';

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

jest.mock('./logging', () => ({
  createLogger: () => mockLogger,
}));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({}),
  })),
}));

const StorageMock = Storage as unknown as jest.Mock;

const credentials = { client_email: 'sa@example.test', private_key: 'key' };

const createConfiguration = (isDevelopment: boolean, overrides: Partial<Configuration> = {}) =>
  ({
    bucket: 'test-bucket',
    host: 'https://example.test',
    isDevelopment: () => isDevelopment,
    ...overrides,
  } as unknown as Configuration);

describe('StorageProvider', () => {
  beforeEach(() => {
    StorageMock.mockClear();
    mockLogger.warn.mockClear();
  });

  describe('deployed', () => {
    it('uses the runtime identity when no credentials are configured', () => {
      new StorageProvider(createConfiguration(false));
      expect(StorageMock).toHaveBeenCalledWith({});
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('ignores configured credentials with a warning and uses the runtime identity', () => {
      new StorageProvider(createConfiguration(false, { storage: { credentials } }));
      expect(StorageMock).toHaveBeenCalledWith({});
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('only used for local development'));
    });

    it('does not parse or echo invalid credentials when ignoring them', () => {
      expect(
        () => new StorageProvider(createConfiguration(false, { storage: { credentials: 'not-json-key-material' } })),
      ).not.toThrow();
      expect(StorageMock).toHaveBeenCalledWith({});
      expect(JSON.stringify(mockLogger.warn.mock.calls)).not.toContain('not-json-key-material');
    });
  });

  describe('local development', () => {
    it('falls back to ./keyfile.json when no credentials are configured', () => {
      new StorageProvider(createConfiguration(true));
      expect(StorageMock).toHaveBeenCalledWith({ keyFilename: './keyfile.json' });
    });

    it('passes object credentials to Storage', () => {
      new StorageProvider(createConfiguration(true, { storage: { credentials } }));
      expect(StorageMock).toHaveBeenCalledWith({ credentials });
    });

    it('parses JSON string credentials', () => {
      new StorageProvider(createConfiguration(true, { storage: { credentials: JSON.stringify(credentials) } }));
      expect(StorageMock).toHaveBeenCalledWith({ credentials });
    });

    it('prefers configured credentials over ./keyfile.json', () => {
      new StorageProvider(createConfiguration(true, { storage: { credentials } }));
      expect(StorageMock).not.toHaveBeenCalledWith(expect.objectContaining({ keyFilename: expect.anything() }));
    });

    it('rejects invalid JSON without echoing the value', () => {
      const keyMaterial = 'not-json-private-key-material';
      let message = '';
      try {
        new StorageProvider(createConfiguration(true, { storage: { credentials: keyMaterial } }));
      } catch (e) {
        message = (e as Error).message;
      }
      expect(message).toBe('storage.credentials is not valid JSON');
      expect(message).not.toContain(keyMaterial);
    });
  });
});
