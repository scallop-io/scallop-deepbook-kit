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
import { mul, normalize } from '../utils/math';

type MarginPoolParamKey = (typeof MARGIN_POOL_PARAM_KEYS)[number];
type MarginPoolWithSupplierCapParamKey = (typeof MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS)[number];
type InterestConfig = {
  highKink: number;
  baseBorrowApr: number;
  borrowAprOnHighKink: number;
  maxBorrowApr: number;
  supplyApr: number;
  utilizationRate: number;
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
      highKink: 0,
      baseBorrowApr: 0,
      borrowAprOnHighKink: 0,
      maxBorrowApr: 0,
      supplyApr: 0,
      utilizationRate: 0,
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

  /**
   * Compute the borrow APR based on utilization and interest config.
   *
   * if (U < optimal) {
   *   r(U) = base_rate + mul(U, base_slope)
   * } else {
   *   r(U) = base_rate + mul(optimal, base_slope) + mul(U - optimal, excess_slope)
   * }
   */
  #computeBorrowAprAtUtil(
    util: bigint, // 1e9-scaled utilization
    cfg: RawInterestConfig
  ): bigint {
    const baseRate = BigInt(cfg.base_rate);
    const baseSlope = BigInt(cfg.base_slope);
    const excessSlope = BigInt(cfg.excess_slope);
    const optimalUtil = BigInt(cfg.optimal_utilization);

    if (util < optimalUtil) {
      return baseRate + mul(util, baseSlope);
    }

    return baseRate + mul(optimalUtil, baseSlope) + mul(util - optimalUtil, excessSlope);
  }

  #calculateKinksAndRate(
    interestConfig: RawInterestConfig,
    marginPoolConfig: RawMarginPoolConfig,
    state: RawStatePoolConfig,
    borrowApr: number
  ) {
    const highKink = BigInt(interestConfig.optimal_utilization); // v0
    const maxKink = BigInt(marginPoolConfig.max_utilization_rate); // U_max

    // const midBorrowApr = this.#computeBorrowAprAtUtil(midKink, interestConfig);
    const borrowAprOnHighKink = this.#computeBorrowAprAtUtil(highKink, interestConfig);
    const maxBorrowApr = this.#computeBorrowAprAtUtil(maxKink, interestConfig);

    const utilizationRate = BigInt(
      BigNumber(state.total_borrow)
        .dividedBy(state.total_supply)
        .shiftedBy(9)
        .decimalPlaces(0)
        .toString()
    );
    const supplyApr = mul(
      mul(BigInt(borrowApr), utilizationRate),
      BigInt(FLOAT_SCALAR) - BigInt(marginPoolConfig.protocol_spread)
    );

    return {
      // raw 1e9-scaled values
      raw: {
        baseBorrowApr: interestConfig.base_rate,
        // midKink, // utilization at kink1
        highKink, // utilization at kink2
        // midBorrowApr, // APR at midKink
        borrowAprOnHighKink, // APR at highKink
        maxBorrowApr, // APR at U = 1.0
        supplyApr,
        utilizationRate,
      },
      // convenience normalized numbers
      normalized: {
        baseBorrowApr: normalize(BigInt(interestConfig.base_rate)),
        // midKink: normalize(midKink),
        highKink: normalize(highKink),
        // midBorrowApr: normalize(midBorrowApr),
        borrowAprOnHighKink: normalize(borrowAprOnHighKink),
        maxBorrowApr: normalize(maxBorrowApr),
        supplyApr: normalize(supplyApr),
        utilizationRate: normalize(utilizationRate),
      },
    };
  }

  /**
   * Internal: Fetch and compute interest configuration parameters.
   * @param coinKey - Asset key.
   * @returns Interest configuration data including kinks and APRs.
   */
  async #getInterestConfig(coinKey: string, interestRate: number) {
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
    const { normalized } = this.#calculateKinksAndRate(
      interestConfig,
      marginPoolConfig,
      statePoolConfig,
      interestRate
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

    const formattedResult = this.#formatResult(
      this.#parseInspectResultToBcsStructs(inspectResult, allKeys),
      coinKey
    );
    const interestData = await this.#getInterestConfig(
      coinKey,
      formattedResult.interestRate * FLOAT_SCALAR
    );

    return {
      ...formattedResult,
      ...interestData,
    };
  }
}
