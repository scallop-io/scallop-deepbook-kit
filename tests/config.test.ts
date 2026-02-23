import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('getConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns testnet by default when NETWORK is not set', async () => {
    delete process.env.NETWORK;
    const { getConfig } = await import('../src/config');
    const config = getConfig();
    expect(config.network).toBe('testnet');
  });

  it('returns mainnet when NETWORK is set to mainnet', async () => {
    process.env.NETWORK = 'mainnet';
    const { getConfig } = await import('../src/config');
    const config = getConfig();
    expect(config.network).toBe('mainnet');
  });

  it('falls back to testnet for invalid NETWORK values', async () => {
    process.env.NETWORK = 'invalid';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getConfig } = await import('../src/config');
    const config = getConfig();
    expect(config.network).toBe('testnet');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('includes rpcUrl from SUI_RPC_URL env var', async () => {
    process.env.SUI_RPC_URL = 'https://custom-rpc.example.com';
    const { getConfig } = await import('../src/config');
    const config = getConfig();
    expect(config.rpcUrl).toBe('https://custom-rpc.example.com');
  });
});

describe('getPrivateKey', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when PRIVATE_KEY is not set', async () => {
    delete process.env.PRIVATE_KEY;
    const { getPrivateKey } = await import('../src/config');
    // Delete again after import since dotenv.config() in the module re-populates from .env
    delete process.env.PRIVATE_KEY;
    expect(() => getPrivateKey()).toThrow('PRIVATE_KEY not found');
  });

  it('returns cleaned private key (strips 0x prefix)', async () => {
    process.env.PRIVATE_KEY = '0x' + 'a'.repeat(64);
    const { getPrivateKey } = await import('../src/config');
    expect(getPrivateKey()).toBe('a'.repeat(64));
  });

  it('returns private key as-is when valid hex', async () => {
    process.env.PRIVATE_KEY = 'ab'.repeat(32);
    const { getPrivateKey } = await import('../src/config');
    expect(getPrivateKey()).toBe('ab'.repeat(32));
  });

  it('warns for non-standard format private key', async () => {
    process.env.PRIVATE_KEY = 'short';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getPrivateKey } = await import('../src/config');
    getPrivateKey(); // should still return it, but with warning
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('getAllConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('includes all config fields', async () => {
    process.env.PRIVATE_KEY = 'ab'.repeat(32);
    process.env.NETWORK = 'testnet';
    process.env.SUPPLIER_CAP_ID = '0x123';
    process.env.SUI_REFERRAL_ID = '0x456';
    process.env.DBUSDC_REFERRAL_ID = '0x789';

    const { getAllConfig } = await import('../src/config');
    const config = getAllConfig();

    expect(config.network).toBe('testnet');
    expect(config.privateKey).toBe('ab'.repeat(32));
    expect(config.supplierCapId).toBe('0x123');
    expect(config.suiReferralId).toBe('0x456');
    expect(config.dbusdcReferralId).toBe('0x789');
  });
});
