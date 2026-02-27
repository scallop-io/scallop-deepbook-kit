import { Transaction } from '@mysten/sui/transactions';
import { normalizeSuiAddress, SUI_RANDOM_OBJECT_ID } from '@mysten/sui/utils';
import {
  MARGIN_POOL_PARAM_KEYS,
  MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS,
} from '../src/margin-pool-config';
import { DeepBookMarginPool } from '../src/toolkit';
import { afterEach, describe, beforeEach, expect, it, vi } from 'vitest';

// Helper to generate a minimal simulateTransaction response
function makeSimulateTransactionResult(keys: string[]) {
  return {
    $kind: 'Transaction' as const,
    commandResults: keys.map(() => ({
      returnValues: [{ bcs: new Uint8Array([1, 2, 3]) }],
    })),
  } as any;
}

function makeGrpcMarginPoolObject({
  totalBorrow = '500000000',
}: {
  totalBorrow?: string;
} = {}) {
  return {
    object: {
      json: {
        config: {
          interest_config: {
            base_rate: '100000000',
            base_slope: '0',
            excess_slope: '0',
            optimal_utilization: '800000000',
          },
          margin_pool_config: {
            max_utilization_rate: '1000000000',
            min_borrow: '0',
            protocol_spread: '0',
            supply_cap: '0',
          },
        },
        state: {
          total_supply: '1000000000',
          total_borrow: totalBorrow,
        },
      },
    },
  } as any;
}

describe('DeepBookMarginPool (unit)', () => {
  let suiClientMock: {
    core: {
      simulateTransaction: ReturnType<typeof vi.fn>;
      getObject: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    suiClientMock = {
      core: {
        simulateTransaction: vi.fn(),
        getObject: vi.fn(),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    vi.spyOn(Transaction.prototype, 'build').mockResolvedValue(new Uint8Array([1, 2, 3]));

    suiClientMock.core.simulateTransaction.mockResolvedValue(
      makeSimulateTransactionResult([
        ...MARGIN_POOL_PARAM_KEYS,
        ...MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS,
      ])
    );

    suiClientMock.core.getObject.mockResolvedValue(makeGrpcMarginPoolObject());

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

    vi.spyOn(Transaction.prototype, 'build').mockResolvedValue(new Uint8Array([1, 2, 3]));

    suiClientMock.core.simulateTransaction.mockResolvedValue(
      makeSimulateTransactionResult([
        ...MARGIN_POOL_PARAM_KEYS,
        ...MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS,
      ])
    );

    vi.spyOn(marginPool as any, 'parseInspectResultToBcsStructs').mockReturnValue({
      interestRate: '132349692',
    } as any);

    vi.spyOn(marginPool as any, 'formatResult').mockReturnValue({
      interestRate: 0.13234969199999999,
    } as any);

    suiClientMock.core.getObject.mockResolvedValue(makeGrpcMarginPoolObject({ totalBorrow: '0' }));

    await expect(marginPool.getPoolParameters('SUI')).resolves.toBeDefined();
  });

  it('sets explicit gas budget/payment when inspecting pool parameters', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock as any });
    const setGasBudgetSpy = vi.spyOn(Transaction.prototype, 'setGasBudget');
    const setGasPaymentSpy = vi.spyOn(Transaction.prototype, 'setGasPayment');
    vi.spyOn(Transaction.prototype, 'build').mockResolvedValue(new Uint8Array([1, 2, 3]));

    suiClientMock.core.simulateTransaction.mockResolvedValue(
      makeSimulateTransactionResult([
        ...MARGIN_POOL_PARAM_KEYS,
        ...MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS,
      ])
    );
    suiClientMock.core.getObject.mockResolvedValue(makeGrpcMarginPoolObject());

    const parsed = {
      interestRate: '132349692',
    } as any;
    vi.spyOn(marginPool as any, 'parseInspectResultToBcsStructs').mockReturnValue(parsed);
    vi.spyOn(marginPool as any, 'formatResult').mockReturnValue({
      interestRate: 0.132349692,
    } as any);

    await marginPool.getPoolParameters('SUI');

    expect(setGasBudgetSpy).toHaveBeenCalledWith(50_000_000_000n);
    expect(setGasPaymentSpy).toHaveBeenCalledWith([]);
  });
});
