import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import {
  setEnvVar,
  getEnvVar,
  getRequiredEnvVar,
  setEnvVars,
  hasEnvVar,
  deleteEnvVar,
} from '../src/utils/env-manager';

// Mock fs to avoid writing to actual .env files during tests
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

describe('getEnvVar', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns the env var value when it exists', () => {
    process.env.TEST_KEY = 'test_value';
    expect(getEnvVar('TEST_KEY')).toBe('test_value');
  });

  it('returns default value when env var is not set', () => {
    delete process.env.NONEXISTENT_KEY;
    expect(getEnvVar('NONEXISTENT_KEY', 'default')).toBe('default');
  });

  it('returns undefined when env var is not set and no default', () => {
    delete process.env.NONEXISTENT_KEY;
    expect(getEnvVar('NONEXISTENT_KEY')).toBeUndefined();
  });
});

describe('getRequiredEnvVar', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns the value when it exists', () => {
    process.env.REQUIRED_KEY = 'value';
    expect(getRequiredEnvVar('REQUIRED_KEY')).toBe('value');
  });

  it('throws when the env var is not set', () => {
    delete process.env.MISSING_KEY;
    expect(() => getRequiredEnvVar('MISSING_KEY')).toThrow(
      'Required environment variable MISSING_KEY is not set'
    );
  });
});

describe('hasEnvVar', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns true when the env var is set and non-empty', () => {
    process.env.HAS_KEY = 'value';
    expect(hasEnvVar('HAS_KEY')).toBe(true);
  });

  it('returns false when the env var is empty string', () => {
    process.env.EMPTY_KEY = '';
    expect(hasEnvVar('EMPTY_KEY')).toBe(false);
  });

  it('returns false when the env var is not set', () => {
    delete process.env.NO_KEY;
    expect(hasEnvVar('NO_KEY')).toBe(false);
  });
});

describe('setEnvVar', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('EXISTING=old_value\n');
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('throws when key is empty', () => {
    expect(() => setEnvVar('', 'value')).toThrow('Key and value are required');
  });

  it('updates process.env', () => {
    setEnvVar('NEW_KEY', 'new_value');
    expect(process.env.NEW_KEY).toBe('new_value');
  });

  it('writes to the .env file', () => {
    setEnvVar('NEW_KEY', 'new_value');
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});

describe('setEnvVars', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('sets multiple env vars at once', () => {
    setEnvVars({ A: '1', B: '2' });
    expect(process.env.A).toBe('1');
    expect(process.env.B).toBe('2');
  });

  it('warns when no variables provided', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    setEnvVars({});
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No variables provided'));
  });
});

describe('deleteEnvVar', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('DELETE_ME=value\n');
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('deletes an existing env var', () => {
    process.env.DELETE_ME = 'value';
    deleteEnvVar('DELETE_ME');
    expect(process.env.DELETE_ME).toBeUndefined();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('warns when deleting a non-existent var', () => {
    vi.mocked(fs.readFileSync).mockReturnValue('');
    const warnSpy = vi.spyOn(console, 'warn');
    deleteEnvVar('NON_EXISTENT');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
  });
});
