import { bcs } from '@mysten/sui/bcs';
import { normalizeSuiAddress, SUI_RANDOM_OBJECT_ID } from '@mysten/sui/utils';
import { Transaction } from '@mysten/sui/transactions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MARGIN_POOL_PARAM_KEYS,
  MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS,
} from '../src/margin-pool-config';
import { DeepBookMarginPool } from '../src/toolkit';

/**
 * `getPoolsParameters` used to read every pool parameter with its own `moveCall` —
 * ten commands per coin — while separately fetching the pool object in the same
 * round. Nine of those ten values are plain fields ON that object, so the calls were
 * re-fetching data already in hand. Measured on a cold dapp load this was the single
 * most expensive read: 14-17KB requests and multi-second simulations.
 *
 * These specs pin the two things that must hold for that shortcut to be safe:
 *   - the values derived from JSON equal what the Move calls returned, and
 *   - the transaction handed back by `inspect: false` is unchanged.
 */

/** Real mainnet SUI margin-pool shape (values from a live BatchGetObjects response). */
const marginPoolJson = ({
  totalBorrow = '520439159',
  totalSupply = '2836082285256',
}: { totalBorrow?: string; totalSupply?: string } = {}) => ({
  config: {
    interest_config: {
      base_rate: '50000000',
      base_slope: '250000000',
      excess_slope: '5000000000',
      optimal_utilization: '800000000',
    },
    margin_pool_config: {
      max_utilization_rate: '900000000',
      min_borrow: '100000',
      protocol_spread: '200000000',
      supply_cap: '30000000000000',
    },
  },
  state: {
    total_supply: totalSupply,
    total_borrow: totalBorrow,
    supply_shares: '2832339446898',
    borrow_shares: '504636603',
    last_update_timestamp: '1785030480669',
  },
});

const poolObject = (overrides?: { totalBorrow?: string; totalSupply?: string }) =>
  ({ json: marginPoolJson(overrides) }) as any;

const CAP_ID = normalizeSuiAddress(SUI_RANDOM_OBJECT_ID);

/** u64 → the BCS bytes a Move call would have returned. */
const u64Bytes = (value: string | number | bigint) => bcs.U64.serialize(BigInt(value)).toBytes();

describe('getPoolsParameters — params read from the pool object', () => {
  let suiClientMock: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    suiClientMock = {
      core: {
        simulateTransaction: vi.fn(),
        getObjects: vi.fn(),
        getObject: vi.fn(),
      },
    };
    vi.spyOn(Transaction.prototype, 'build').mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  it('returns the same values the Move calls would have, straight from JSON', async () => {
    // intent: equivalence. These are the nine fields that no longer cost a moveCall;
    // each must come back exactly as the on-chain accessor reported it.
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock });
    suiClientMock.core.getObjects.mockResolvedValue({ objects: [poolObject()] });
    // Only `interestRate` is still asked for.
    suiClientMock.core.simulateTransaction.mockResolvedValue({
      $kind: 'Transaction' as const,
      commandResults: [{ returnValues: [{ bcs: u64Bytes('50045876') }] }],
    });

    const [params] = (await marginPool.getPoolsParameters({ coinKeys: ['SUI'] })) as any[];
    const scalar = 1e9; // SUI

    expect(params.supplyCap).toBe(30000000000000 / scalar);
    expect(params.minBorrow).toBe(100000 / scalar);
    expect(params.totalSupply).toBe(2836082285256 / scalar);
    expect(params.supplyShares).toBe(2832339446898 / scalar);
    expect(params.totalBorrow).toBe(520439159 / scalar);
    expect(params.borrowShares).toBe(504636603 / scalar);
    // FLOAT_SCALAR-scaled, not coin-scaled.
    expect(params.maxUtilizationRate).toBeCloseTo(0.9, 9);
    expect(params.protocolSpread).toBeCloseTo(0.2, 9);
    // Passed through verbatim as epoch ms.
    expect(params.lastUpdateTimestamp).toBe(1785030480669);
  });

  it('issues ONE moveCall per coin instead of ten', async () => {
    // intent: the actual saving. 10 pools went from ~100 PTB commands to 10.
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock });
    const coinKeys = ['SUI', 'USDC', 'DEEP'];
    suiClientMock.core.getObjects.mockResolvedValue({
      objects: coinKeys.map(() => poolObject()),
    });
    suiClientMock.core.simulateTransaction.mockResolvedValue({
      $kind: 'Transaction' as const,
      commandResults: coinKeys.map(() => ({ returnValues: [{ bcs: u64Bytes('50045876') }] })),
    });

    // Spy on the instance, not the prototype: the deepbook contract helpers call
    // `tx.add` internally too, which would double-count.
    const tx = new Transaction();
    const addSpy = vi.spyOn(tx, 'add');
    await marginPool.getPoolsParameters({ coinKeys, tx });

    // One command per coin, where it used to be MARGIN_POOL_PARAM_KEYS.length each.
    expect(addSpy).toHaveBeenCalledTimes(coinKeys.length);
    expect(MARGIN_POOL_PARAM_KEYS.length).toBeGreaterThan(1); // guard: the win is real
  });

  it('still reads supplier-cap params from the simulation, aligned per coin', async () => {
    // intent: userSupplyShares/userSupplyAmount are per-user and NOT on the pool
    // object, so they must keep coming from Move calls — and land on the right coin.
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock });
    const coinKeys = ['SUI', 'USDC'];
    suiClientMock.core.getObjects.mockResolvedValue({
      objects: coinKeys.map(() => poolObject()),
    });
    // Per coin, in add order: interestRate, then the cap keys.
    suiClientMock.core.simulateTransaction.mockResolvedValue({
      $kind: 'Transaction' as const,
      commandResults: [
        { returnValues: [{ bcs: u64Bytes('50045876') }] },
        { returnValues: [{ bcs: u64Bytes('111') }] },
        { returnValues: [{ bcs: u64Bytes('222') }] },
        { returnValues: [{ bcs: u64Bytes('50045876') }] },
        { returnValues: [{ bcs: u64Bytes('333') }] },
        { returnValues: [{ bcs: u64Bytes('444') }] },
      ],
    });

    const results = (await marginPool.getPoolsParameters({
      coinKeys,
      supplierCapId: CAP_ID,
    })) as any[];

    expect(MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS).toEqual(['userSupplyShares', 'userSupplyAmount']);
    expect(results[0].userSupplyShares).toBe(111 / 1e9);
    expect(results[0].userSupplyAmount).toBe(222 / 1e9);
    // The second coin must get ITS slice, not the first coin's.
    expect(results[1].userSupplyShares).toBeGreaterThan(0);
    expect(results[1].userSupplyAmount).toBeGreaterThan(results[1].userSupplyShares);
  });

  it('leaves the inspect:false transaction carrying every param call', async () => {
    // intent: callers that build their own tx must see no change — the read-path
    // shortcut would otherwise silently alter what their transaction returns.
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock });
    const inputTx = new Transaction();
    const addSpy = vi.spyOn(inputTx, 'add');

    const tx = await marginPool.getPoolsParameters({
      coinKeys: ['SUI'],
      supplierCapId: CAP_ID,
      tx: inputTx,
      inspect: false,
    });

    expect(tx).toBe(inputTx);
    expect(addSpy).toHaveBeenCalledTimes(
      MARGIN_POOL_PARAM_KEYS.length + MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS.length
    );
    expect(suiClientMock.core.simulateTransaction).not.toHaveBeenCalled();
  });

  it('reports zero utilization for an empty pool without dividing by zero', async () => {
    const marginPool = new DeepBookMarginPool({ suiClient: suiClientMock });
    suiClientMock.core.getObjects.mockResolvedValue({
      objects: [poolObject({ totalBorrow: '0', totalSupply: '0' })],
    });
    suiClientMock.core.simulateTransaction.mockResolvedValue({
      $kind: 'Transaction' as const,
      commandResults: [{ returnValues: [{ bcs: u64Bytes('50000000') }] }],
    });

    const [params] = (await marginPool.getPoolsParameters({
      coinKeys: ['SUI'],
    })) as any[];

    expect(params.utilizationRate).toBe(0);
    // Base rate still applies at zero utilization.
    expect(params.interestRate).toBeCloseTo(0.05, 9);
  });
});
