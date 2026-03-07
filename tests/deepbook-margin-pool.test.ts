import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress, SUI_RANDOM_OBJECT_ID } from '@mysten/sui/utils';
import {
  MARGIN_POOL_PARAM_KEYS,
  MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS,
} from '../src/margin-pool-config';
import { DeepBookMarginPool } from '../src/toolkit';
import { describe, beforeEach, expect, it, vi } from 'vitest';

// Helper to generate a minimal devInspect response
function makeDevInspectResult(keys: string[], validU64 = false) {
  // U64 BCS encoding requires 8 bytes
  const bytes = validU64 ? new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]) : new Uint8Array([1, 2, 3]);
  return {
    results: keys.map(() => ({
      returnValues: [[bytes, 'u8']],
    })),
  } as any;
}

// Helper to build a mock margin pool object response
function makeMarginPoolObjectResponse() {
  return {
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
  } as any;
}

describe('DeepBookMarginPool (unit)', () => {
  let suiClientMock: {
    devInspectTransactionBlock: ReturnType<typeof vi.fn>;
    getObject: ReturnType<typeof vi.fn>;
    multiGetObjects: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    suiClientMock = {
      devInspectTransactionBlock: vi.fn(),
      getObject: vi.fn(),
      multiGetObjects: vi.fn(),
    };
  });

  it('initializes correctly with default config', () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });
    expect(marginPool).toBeDefined();
    expect(marginPool.marginPoolContract).toBeDefined();
    expect(marginPool.network).toBe('mainnet');
  });

  it('sets env correctly', () => {
    const marginPoolTestnet = new DeepBookMarginPool({
      network: 'testnet',
      suiClient: suiClientMock as any,
    });
    expect(marginPoolTestnet.network).toBe('testnet');

    const marginPoolMainnet = new DeepBookMarginPool({
      network: 'mainnet',
      suiClient: suiClientMock as any,
    });
    expect(marginPoolMainnet.network).toBe('mainnet');

    const marginPoolDefault = new DeepBookMarginPool({ suiClient: suiClientMock as any });
    expect(marginPoolDefault.network).toBe('mainnet');
  });

  it('throws when network mismatches dbConfig.network (both explicitly provided)', () => {
    const init = () =>
      new DeepBookMarginPool({
        network: 'testnet',
        suiClient: suiClientMock as any,
        dbConfig: { network: 'mainnet', address: '' } as any,
      });
    expect(init).toThrow(/Mismatch between provided network/i);
  });

  it('defaults network from dbConfig if network is not provided', () => {
    const marginPool = new DeepBookMarginPool({
      suiClient: suiClientMock as any,
      dbConfig: { network: 'testnet', address: '' } as any,
    });
    expect(marginPool.network).toBe('testnet');
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

    vi.spyOn(marginPool as any, 'parseInspectResultToBcsStructs').mockReturnValue(parsed);

    vi.spyOn(marginPool as any, 'formatResult').mockReturnValue({
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
    const addSpy = vi.spyOn(tx, 'add');

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

    vi.spyOn(marginPool as any, 'parseInspectResultToBcsStructs').mockReturnValue({
      interestRate: '132349692',
    } as any);

    vi.spyOn(marginPool as any, 'formatResult').mockReturnValue({
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

  // ---------------------------------------------------------------
  // getPoolsParameters (batch)
  // ---------------------------------------------------------------

  it('getPoolsParameters returns Transaction when inspect=false', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });
    const tx = await marginPool.getPoolsParameters(
      ['SUI', 'USDC'],
      undefined,
      new Transaction(),
      false
    );
    expect(tx).toBeInstanceOf(Transaction);
  });

  it('getPoolsParameters adds correct number of calls per coin', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });
    const tx = new Transaction();
    const addSpy = vi.spyOn(tx, 'add');

    await marginPool.getPoolsParameters(['SUI', 'USDC'], undefined, tx, false);

    // Each coin gets MARGIN_POOL_PARAM_KEYS calls (no supplierCap)
    expect(addSpy.mock.calls.length).toBe(MARGIN_POOL_PARAM_KEYS.length * 2);
  });

  it('getPoolsParameters adds supplier-cap calls for each coin', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });
    const tx = new Transaction();
    const addSpy = vi.spyOn(tx, 'add');

    const capId = normalizeSuiAddress(SUI_RANDOM_OBJECT_ID);
    await marginPool.getPoolsParameters(['SUI', 'USDC'], capId, tx, false);

    const expectedPerCoin =
      MARGIN_POOL_PARAM_KEYS.length + MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS.length;
    expect(addSpy.mock.calls.length).toBe(expectedPerCoin * 2);
  });

  it('getPoolsParameters returns parsed params for multiple coins', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });
    const coinKeys = ['SUI', 'USDC'];
    const keysPerCoin = MARGIN_POOL_PARAM_KEYS.length;

    // devInspect returns results for all coins in one response (valid U64 bytes)
    suiClientMock.devInspectTransactionBlock.mockResolvedValue(
      makeDevInspectResult(Array.from({ length: keysPerCoin * coinKeys.length }), true)
    );

    // multiGetObjects returns one response per coin
    suiClientMock.multiGetObjects.mockResolvedValue(
      coinKeys.map(() => makeMarginPoolObjectResponse())
    );

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
    } as any;

    vi.spyOn(marginPool as any, 'formatResult').mockReturnValue({
      ...parsed,
      interestRate: 0.132349692,
      decimals: 9,
      scalar: 1e9,
      highKink: 0,
      baseBorrowApr: 0,
      borrowAprOnHighKink: 0,
      maxBorrowApr: 0,
      supplyApr: 0,
      utilizationRate: 0,
    });

    const results = await marginPool.getPoolsParameters(coinKeys);

    expect(results).toHaveLength(2);
    expect(suiClientMock.devInspectTransactionBlock).toHaveBeenCalledTimes(1);
    expect(suiClientMock.multiGetObjects).toHaveBeenCalledTimes(1);

    for (const result of results) {
      MARGIN_POOL_PARAM_KEYS.forEach((key) => {
        expect(result).toHaveProperty(key);
      });
    }
  });

  it('getPoolsParameters throws when multiGetObjects returns error', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });

    suiClientMock.devInspectTransactionBlock.mockResolvedValue(
      makeDevInspectResult(Array.from({ length: MARGIN_POOL_PARAM_KEYS.length }), true)
    );

    suiClientMock.multiGetObjects.mockResolvedValue([{ error: { code: 'notFound' } }]);

    await expect(marginPool.getPoolsParameters(['SUI'])).rejects.toThrow(
      /Failed to fetch interest config for SUI/
    );
  });

  it('getPoolsParameters throws when devInspect returns no results', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });

    suiClientMock.devInspectTransactionBlock.mockResolvedValue({ results: null });
    suiClientMock.multiGetObjects.mockResolvedValue([makeMarginPoolObjectResponse()]);

    await expect(marginPool.getPoolsParameters(['SUI'])).rejects.toThrow(
      /No results found in DevInspect output/
    );
  });

  it('getPoolsParameters batches multiGetObjects calls in groups of 50', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });

    // Use valid coin keys repeated to reach 75
    const validKeys = ['SUI', 'USDC', 'DEEP'];
    const coinKeys = Array.from({ length: 75 }, (_, i) => validKeys[i % validKeys.length]!);
    const keysPerCoin = MARGIN_POOL_PARAM_KEYS.length;

    suiClientMock.devInspectTransactionBlock.mockResolvedValue(
      makeDevInspectResult(Array.from({ length: keysPerCoin * coinKeys.length }), true)
    );

    suiClientMock.multiGetObjects
      .mockResolvedValueOnce(Array.from({ length: 50 }, () => makeMarginPoolObjectResponse()))
      .mockResolvedValueOnce(Array.from({ length: 25 }, () => makeMarginPoolObjectResponse()));

    vi.spyOn(marginPool as any, 'formatResult').mockReturnValue({
      interestRate: 0,
      decimals: 9,
      highKink: 0,
      baseBorrowApr: 0,
      borrowAprOnHighKink: 0,
      maxBorrowApr: 0,
      supplyApr: 0,
      utilizationRate: 0,
    });

    const results = await marginPool.getPoolsParameters(coinKeys);

    expect(results).toHaveLength(75);
    expect(suiClientMock.multiGetObjects).toHaveBeenCalledTimes(2);
    expect(suiClientMock.devInspectTransactionBlock).toHaveBeenCalledTimes(1);
  });
});
