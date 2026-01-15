import { MARGIN_POOL_PARAM_KEYS } from '../src/margin-pool-config';
import { DeepBookMarginPool } from '../src/toolkit';

describe('DeepBookMarginPool Tests', () => {
  it('Should successfully init the class instance', () => {
    const marginPool = new DeepBookMarginPool();
    expect(marginPool).toBeDefined();
    expect(marginPool.marginPoolContract).toBeDefined();
  });

  it('Should set the env correctly', () => {
    const marginPoolTestnet = new DeepBookMarginPool({ env: 'testnet' });
    expect(marginPoolTestnet.env).toBe('testnet');

    const marginPoolMainnet = new DeepBookMarginPool({ env: 'mainnet' });
    expect(marginPoolMainnet.env).toBe('mainnet');

    const marginPoolDefault = new DeepBookMarginPool();
    expect(marginPoolDefault.env).toBe('mainnet');
  });

  it('Should return pool parameters', async () => {
    const marginPool = new DeepBookMarginPool();
    const suiParams = await marginPool.getPoolParameters('SUI');
    expect(suiParams).toBeDefined();

    MARGIN_POOL_PARAM_KEYS.forEach((key) => {
      expect(suiParams).toHaveProperty(key);
    });
  });
});
