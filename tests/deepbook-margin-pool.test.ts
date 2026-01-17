import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress, SUI_RANDOM_OBJECT_ID } from '@mysten/sui/utils';
import {
  MARGIN_POOL_PARAM_KEYS,
  MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS,
} from '../src/margin-pool-config';
import { DeepBookMarginPool } from '../src/toolkit';

// Helper to generate a minimal devInspect response
function makeDevInspectResult(keys: string[]) {
  return {
    results: keys.map(() => ({
      returnValues: [[new Uint8Array([1, 2, 3]), 'u8']],
    })),
  } as any;
}

describe('DeepBookMarginPool (unit)', () => {
  let suiClientMock: jest.Mocked<SuiClient>;

  beforeEach(() => {
    suiClientMock = {
      devInspectTransactionBlock: jest.fn(),
      getObject: jest.fn(),
    } as any;
  });

  it('initializes correctly with default config', () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });
    expect(marginPool).toBeDefined();
    expect(marginPool.marginPoolContract).toBeDefined();
    expect(marginPool.env).toBe('mainnet');
  });

  it('sets env correctly', () => {
    const marginPoolTestnet = new DeepBookMarginPool({
      env: 'testnet',
      suiClient: suiClientMock as any,
    });
    expect(marginPoolTestnet.env).toBe('testnet');

    const marginPoolMainnet = new DeepBookMarginPool({
      env: 'mainnet',
      suiClient: suiClientMock as any,
    });
    expect(marginPoolMainnet.env).toBe('mainnet');

    const marginPoolDefault = new DeepBookMarginPool({ suiClient: suiClientMock as any });
    expect(marginPoolDefault.env).toBe('mainnet');
  });

  it('throws when env mismatches dbConfig.env', () => {
    const init = () =>
      new DeepBookMarginPool({
        env: 'testnet',
        suiClient: suiClientMock as any,
        dbConfig: { env: 'mainnet', address: '' } as any,
      });

    expect(init).toThrow(/Mismatch between provided env/i);
  });

  it('returns Transaction when inspect=false', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });
    const tx = await marginPool.getPoolParameters('SUI', undefined, new Transaction(), false);
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('returns pool parameters when inspect=true', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });

    suiClientMock.devInspectTransactionBlock.mockResolvedValue(
      makeDevInspectResult([...MARGIN_POOL_PARAM_KEYS, ...MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS])
    );

    suiClientMock.getObject.mockResolvedValue({
      data: {
        content: {
          fields: {
            config: {
              fields: {
                interest_config: {
                  fields: {
                    base_rate: '100000000',
                    base_slope: '0',
                    excess_slope: '0',
                    optimal_utilization: '800000000',
                  },
                },
                margin_pool_config: {
                  fields: {
                    max_utilization_rate: '1000000000',
                    min_borrow: '0',
                    protocol_spread: '0',
                    supply_cap: '0',
                  },
                },
              },
            },
            state: {
              fields: {
                total_supply: '1000000000',
                total_borrow: '500000000',
              },
            },
          },
        },
      },
    } as any);

    const parsed = {
      supplyCap: '0',
      maxUtilizationRate: '900000000',
      protocolSpread: '0',
      minBorrow: '0',
      interestRate: '132349692',
      totalSupply: '1000000000',
      supplyShares: '0',
      totalBorrow: '500000000',
      borrowShares: '0',
      lastUpdateTimestamp: '1700000000',
      userSupplyShares: '0',
      userSupplyAmount: '0',
    } as any;

    jest.spyOn(marginPool as any, 'parseInspectResultToBcsStructs').mockReturnValue(parsed);

    jest.spyOn(marginPool as any, 'formatResult').mockReturnValue({
      ...parsed,
      interestRate: 0.132349692,
      decimals: 9,
      scalar: 1e9,
      address: '0x1',
      type: '0x1::sui::SUI',
      feed: '',
      currencyId: '',
      priceInfoObjectId: '',
      highKink: 0,
      baseBorrowApr: 0,
      borrowAprOnHighKink: 0,
      maxBorrowApr: 0,
      supplyApr: 0,
      utilizationRate: 0,
    });

    const params = await marginPool.getPoolParameters('SUI');
    expect(params).toBeDefined();

    MARGIN_POOL_PARAM_KEYS.forEach((key) => {
      expect(params).toHaveProperty(key);
    });
  });

  it('adds supplier-cap calls when supplierCapId is provided', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });
    const tx = new Transaction();
    const addSpy = jest.spyOn(tx, 'add');

    await marginPool.getPoolParameters('SUI', normalizeSuiAddress(SUI_RANDOM_OBJECT_ID), tx, false);

    expect(addSpy.mock.calls.length).toBeGreaterThanOrEqual(
      MARGIN_POOL_PARAM_KEYS.length + MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS.length
    );
  });

  it('does not convert float interestRate into BigInt', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });

    suiClientMock.devInspectTransactionBlock.mockResolvedValue(
      makeDevInspectResult([...MARGIN_POOL_PARAM_KEYS, ...MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS])
    );

    jest
      .spyOn(marginPool as any, 'parseInspectResultToBcsStructs')
      .mockReturnValue({ interestRate: '132349692' } as any);

    jest.spyOn(marginPool as any, 'formatResult').mockReturnValue({
      interestRate: 0.13234969199999999,
    } as any);

    suiClientMock.getObject.mockResolvedValue({
      data: {
        content: {
          fields: {
            config: {
              fields: {
                interest_config: {
                  fields: {
                    base_rate: '100000000',
                    base_slope: '0',
                    excess_slope: '0',
                    optimal_utilization: '800000000',
                  },
                },
                margin_pool_config: {
                  fields: {
                    max_utilization_rate: '1000000000',
                    protocol_spread: '0',
                    min_borrow: '0',
                    supply_cap: '0',
                  },
                },
              },
            },
            state: {
              fields: {
                total_supply: '1000000000',
                total_borrow: '0',
              },
            },
          },
        },
      },
    } as any);

    await expect(marginPool.getPoolParameters('SUI')).resolves.toBeDefined();
  });
});
