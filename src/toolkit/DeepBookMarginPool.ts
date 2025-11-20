import { DeepBookConfig, FLOAT_SCALAR, MarginPoolContract } from '@mysten/deepbook-v3';
import { DevInspectResults, getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import {
  MARGIN_POOL_PARAM_KEY_STRUCT_MAP,
  MARGIN_POOL_PARAM_KEYS,
  MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS,
} from '../testnet-config';
import { bcs } from '@mysten/sui/bcs';
import { TESTNET_COINS, TESTNET_MARGIN_POOLS, TESTNET_POOLS } from '../testnet-config';
import { NetworkType } from './types';
import { BigNumber } from 'bignumber.js';

type MarginPoolParamKey = (typeof MARGIN_POOL_PARAM_KEYS)[number];
type MarginPoolWithSupplierCapParamKey = (typeof MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS)[number];
type InterestConfig = {
  midKink: number;
  highKink: number;
  baseBorrowApr: number;
  midBorrowApr: number;
  highBorrowApr: number;
  maxBorrowApr: number;
  borrowApr: number;
};
export type MarginPoolParams = Record<
  MarginPoolParamKey | MarginPoolWithSupplierCapParamKey,
  number
> &
  InterestConfig & {
    address: string;
    type: string;
    scalar: number;
    decimals: number;
  };

type RawInterestConfig = {
  base_rate: string;
  base_slope: string;
  excess_slope: string;
  optimal_utilization: string;
};

type RawMarginPoolConfig = {
  max_utilization_rate: string;
  min_borrow: string;
  protocol_spread: string;
  supply_cap: string;
};

type RawStatePoolConfig = {
  total_supply: string;
  total_borrow: string;
};

// Track which param keys require a supplierCap argument
const _WITH_CAP_KEYS = new Set<string>(MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS as readonly string[]);

/**
 * Type guard: checks if a margin param key requires a supplier cap.
 */
const isWithSupplierCapKey = (
  key: MarginPoolParamKey | MarginPoolWithSupplierCapParamKey
): key is MarginPoolWithSupplierCapParamKey => {
  return _WITH_CAP_KEYS.has(key as string);
};

/**
 * DeepBookMarginPool
 * -------------------
 * Helper class wrapping DeepBook's MarginPool contract interactions.
 * - Handles parameter retrieval
 * - Manages DevInspect calls for previewing pool parameters
 * - Supports supplier-cap based parameter calls
 */
export class DeepBookMarginPool {
  marginPoolContract: MarginPoolContract;
  dbConfig: DeepBookConfig;

  /**
   * @param dbConfig - DeepBook configuration instance.
   * @param suiClient - Optional SuiClient; defaults to fullnode client based on config env.
   */
  constructor(
    env: NetworkType = 'testnet',
    address = '',
    readonly suiClient = new SuiClient({ url: getFullnodeUrl(env) }),
    dbConfig?: DeepBookConfig
  ) {
    this.dbConfig =
      dbConfig ??
      new DeepBookConfig({
        env,
        address,
        coins: TESTNET_COINS,
        pools: TESTNET_POOLS,
        marginPools: {
          SUI: {
            address: TESTNET_MARGIN_POOLS.SUI.address,
            type: TESTNET_MARGIN_POOLS.SUI.coinType,
          },
          DBUSDC: {
            address: TESTNET_MARGIN_POOLS.DBUSDC.address,
            type: TESTNET_MARGIN_POOLS.DBUSDC.coinType,
          },
        },
      });
    // Initialize smart contract wrapper
    this.marginPoolContract = new MarginPoolContract(this.dbConfig);
  }

  get env() {
    return this.dbConfig.env;
  }

  // ---------------------------
  // Method Overloads (private)
  // ---------------------------

  /**
   * Add a margin pool parameter call (no supplier cap).
   */
  #addParamCall(tx: Transaction, paramKey: MarginPoolParamKey, coinKey: string): void;

  /**
   * Add a margin pool parameter call (with supplier cap).
   */
  #addParamCall(
    tx: Transaction,
    paramKey: MarginPoolWithSupplierCapParamKey,
    coinKey: string,
    supplierCap?: string
  ): void;

  // ---------------------------
  // Single Implementation
  // ---------------------------

  /**
   * Internal utility to append calls to the transaction object.
   * Automatically chooses correct contract call based on parameter type.
   */
  #addParamCall(
    tx: Transaction,
    paramKey: MarginPoolParamKey | MarginPoolWithSupplierCapParamKey,
    coinKey: string,
    supplierCap?: string
  ): void {
    // Keys that require a supplierCap argument
    if (isWithSupplierCapKey(paramKey)) {
      const fn = this.marginPoolContract[paramKey];
      if (supplierCap == null) {
        throw new Error(`supplierCap is required for '${paramKey}'.`);
      }
      // @ts-ignore
      tx.add(fn(coinKey, supplierCap));
    } else {
      const fn = this.marginPoolContract[paramKey];
      // Normal parameters without supplierCap
      // @ts-ignore
      tx.add(fn(coinKey));
    }
  }

  /**
   * Parse DevInspect results into BCS-decoded parameter objects.
   * Used to extract actual values returned from contract functions.
   */
  #parseInspectResultToBcsStructs(
    inspectResults: DevInspectResults,
    keys: (MarginPoolParamKey | MarginPoolWithSupplierCapParamKey)[]
  ) {
    const results = inspectResults.results;
    if (!results) return {};

    return keys.reduce(
      (acc, key, idx) => {
        // Raw bytes returned from devInspect
        const bytes = results[idx]?.returnValues?.[0]?.[0];
        if (!bytes) return acc;

        // Decode bytes according to struct map
        const bcsType = bcs[MARGIN_POOL_PARAM_KEY_STRUCT_MAP[key]];
        acc[key] = bcsType.parse(new Uint8Array(bytes));

        return acc;
      },
      {} as Record<string, string>
    );
  }

  #formatResult(
    result: Record<MarginPoolParamKey | MarginPoolWithSupplierCapParamKey, string>,
    coinKey: string
  ): MarginPoolParams {
    const coin = this.dbConfig.getCoin(coinKey);

    const formatted: MarginPoolParams = {
      supplyCap: 0,
      maxUtilizationRate: 0,
      protocolSpread: 0,
      minBorrow: 0,
      interestRate: 0,
      totalSupply: 0,
      supplyShares: 0,
      totalBorrow: 0,
      borrowShares: 0,
      lastUpdateTimestamp: 0,
      userSupplyShares: 0,
      userSupplyAmount: 0,
      decimals: 0,
      midKink: 0,
      highKink: 0,
      baseBorrowApr: 0,
      midBorrowApr: 0,
      highBorrowApr: 0,
      maxBorrowApr: 0,
      borrowApr: 0,
      ...coin,
    };

    if (!coin) return formatted;

    const useFloatScalarKeys = new Set<string>([
      'interestRate',
      'maxUtilizationRate',
      'protocolSpread',
    ]);
    for (const [key, value] of Object.entries(result)) {
      if (key === 'lastUpdateTimestamp') {
        formatted[key] = Number(value);
      } else if (useFloatScalarKeys.has(key)) {
        // @ts-ignore
        formatted[key] = new BigNumber(value).dividedBy(FLOAT_SCALAR).toNumber();
      } else {
        formatted[key as MarginPoolParamKey | MarginPoolWithSupplierCapParamKey] = new BigNumber(
          value
        )
          .dividedBy(coin.scalar)
          .toNumber();
      }
    }
    return formatted;
  }

  #getCurrentBorrowApr(utilizationRate: bigint, interestConfig: RawInterestConfig) {
    const baseRate = BigInt(interestConfig.base_rate); // B
    const baseSlope = BigInt(interestConfig.base_slope); // S
    const excessSlope = BigInt(interestConfig.excess_slope); // E
    const optimalUtil = BigInt(interestConfig.optimal_utilization); // Uopt

    // clamp U to [0, 1e9]
    const U =
      utilizationRate < 0n
        ? 0n
        : utilizationRate > BigInt(FLOAT_SCALAR)
          ? BigInt(FLOAT_SCALAR)
          : BigInt(utilizationRate);

    if (U <= optimalUtil) {
      // r(U) = B + S * U / Uopt
      return baseRate + (baseSlope * U) / optimalUtil;
    }

    // r(U) = B + S + E * (U - Uopt) / (1 - Uopt)
    return (
      baseRate +
      baseSlope +
      (excessSlope * (U - optimalUtil)) / (BigInt(FLOAT_SCALAR) - optimalUtil)
    );
  }

  #calculateKinksAndBorrowApr(
    interestConfig: RawInterestConfig,
    marginPoolConfig: RawMarginPoolConfig,
    state: RawStatePoolConfig
  ) {
    const baseRate = BigInt(interestConfig.base_rate);
    const baseSlope = BigInt(interestConfig.base_slope);
    const excessSlope = BigInt(interestConfig.excess_slope);
    const optimalUtil = BigInt(interestConfig.optimal_utilization);
    const maxUtil = BigInt(marginPoolConfig.max_utilization_rate);

    // Kinks (still 1e9-scaled)
    const midKink = optimalUtil;
    const highKink = maxUtil;

    // APRs in 1e9 scale
    const baseBorrowApr = baseRate;
    const midBorrowApr = baseRate + baseSlope;

    // highBorrowApr at U = maxUtil
    // r(U) = base + slope + excess * (U - optimal) / (1 - optimal)
    const highBorrowApr =
      baseRate +
      baseSlope +
      (excessSlope * (maxUtil - optimalUtil)) / (1_000_000_000n - optimalUtil);

    // maxBorrowApr at U = 1.0 (i.e. 1e9)
    const maxBorrowApr = baseRate + baseSlope + excessSlope;
    const currentBorrowApr = this.#getCurrentBorrowApr(
      BigInt(
        BigNumber(state.total_borrow)
          .dividedBy(state.total_supply)
          .shiftedBy(9)
          .decimalPlaces(0)
          .toString()
      ),
      interestConfig
    );

    const normalize = (value: bigint) => BigNumber(value).dividedBy(FLOAT_SCALAR).toNumber();

    return {
      // raw 1e9-scaled values (BigInt)
      raw: {
        midKink,
        highKink,
        baseBorrowApr,
        midBorrowApr,
        highBorrowApr,
        maxBorrowApr,
        borrowApr: currentBorrowApr,
      },
      // convenience: normalized numbers (e.g. 0.125 = 12.5%)
      normalized: {
        midKink: normalize(midKink),
        highKink: normalize(highKink),
        baseBorrowApr: normalize(baseBorrowApr),
        midBorrowApr: normalize(midBorrowApr),
        highBorrowApr: normalize(highBorrowApr),
        maxBorrowApr: normalize(maxBorrowApr),
        borrowApr: normalize(currentBorrowApr),
      },
    };
  }

  /**
   * Internal: Fetch and compute interest configuration parameters.
   * @param coinKey - Asset key.
   * @returns Interest configuration data including kinks and APRs.
   */
  async #getInterestConfig(coinKey: string) {
    const { address } = this.dbConfig.getMarginPool(coinKey);
    const response = await this.suiClient.getObject({
      id: address,
      options: {
        showContent: true,
      },
    });

    const fields = (response.data?.content as any).fields;
    const config = fields.config.fields;
    const interestConfig = config.interest_config.fields as RawInterestConfig;
    const marginPoolConfig = config.margin_pool_config.fields as RawMarginPoolConfig;
    const statePoolConfig = fields.state.fields as RawStatePoolConfig;
    const { normalized } = this.#calculateKinksAndBorrowApr(
      interestConfig,
      marginPoolConfig,
      statePoolConfig
    );
    return normalized;
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * Build a transaction for pool parameters that can include supplier-cap inputs.
   *
   * @param coinKey - Asset key.
   * @param supplierCapId - Supplier cap object ID.
   * @param tx - Optional transaction to append to.
   * @param inspect - Whether to perform devInspect and return decoded results.
   *
   * @returns Parsed parameters or transaction object ready for execution.
   */
  async getPoolParameters(
    coinKey: string,
    supplierCapId?: string,
    tx?: Transaction
  ): Promise<MarginPoolParams>;

  async getPoolParameters(
    coinKey: string,
    supplierCapId: string | undefined,
    tx: Transaction,
    inspect: true
  ): Promise<MarginPoolParams>;

  async getPoolParameters(
    coinKey: string,
    supplierCapId: string | undefined,
    tx: Transaction,
    inspect: false
  ): Promise<Transaction>;

  // 👇 implementation signature (must be last)
  async getPoolParameters(
    coinKey: string,
    supplierCapId?: string,
    tx: Transaction = new Transaction(),
    inspect: boolean = true
  ): Promise<MarginPoolParams | Transaction> {
    // Add base parameters
    MARGIN_POOL_PARAM_KEYS.forEach((paramKey) => this.#addParamCall(tx, paramKey, coinKey));

    // Add parameters that require supplierCap (if provided)
    if (supplierCapId) {
      MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS.forEach((paramKey) =>
        this.#addParamCall(tx, paramKey, coinKey, supplierCapId)
      );
    }

    // If inspect is disabled, return the built transaction
    if (!inspect) return tx;

    // Perform devInspect and decode results
    const allKeys: (MarginPoolParamKey | MarginPoolWithSupplierCapParamKey)[] = [
      ...MARGIN_POOL_PARAM_KEYS,
      ...MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS,
    ];

    const inspectResult = await this.suiClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: this.dbConfig.address,
    });

    const interestData = await this.#getInterestConfig(coinKey);
    const formattedResult = this.#formatResult(
      this.#parseInspectResultToBcsStructs(inspectResult, allKeys),
      coinKey
    );

    return {
      ...formattedResult,
      ...interestData,
    };
  }
}
