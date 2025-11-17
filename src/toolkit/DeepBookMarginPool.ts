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

  /**
   * @param dbConfig - DeepBook configuration instance.
   * @param suiClient - Optional SuiClient; defaults to fullnode client based on config env.
   */
  constructor(
    env: NetworkType = 'testnet',
    readonly dbConfig: DeepBookConfig = new DeepBookConfig({
      env,
      address: '',
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
    }),
    readonly suiClient = new SuiClient({ url: getFullnodeUrl(dbConfig.env) })
  ) {
    // Initialize smart contract wrapper
    this.marginPoolContract = new MarginPoolContract(dbConfig);
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
      tx.add(fn(coinKey, supplierCap));
    } else {
      const fn = this.marginPoolContract[paramKey];
      // Normal parameters without supplierCap
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
  ): Record<MarginPoolParamKey | MarginPoolWithSupplierCapParamKey, number> {
    const coin = this.dbConfig.getCoin(coinKey);

    const formatted: Record<MarginPoolParamKey | MarginPoolWithSupplierCapParamKey, number> = {
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
    };

    if (!coin) return formatted;

    for (const [key, value] of Object.entries(result)) {
      if (key === 'lastUpdateTimestamp') {
        formatted[key] = Number(value);
      } else if (key === 'interestRate') {
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

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * Build a transaction for pool parameters that require supplier-cap inputs.
   * This *does not* run devInspect — it only constructs the transaction.
   *
   * @param coinKey - Asset key.
   * @param supplierCapId - Supplier cap object ID.
   * @param tx - Optional transaction to append to.
   *
   * @returns Transaction object ready for execution or further composition.
   */
  async getPoolParameters(
    coinKey: string,
    supplierCapId?: string,
    tx?: Transaction
  ): Promise<Record<MarginPoolParamKey | MarginPoolWithSupplierCapParamKey, number>>;

  async getPoolParameters(
    coinKey: string,
    supplierCapId: string | undefined,
    tx: Transaction,
    inspect: true
  ): Promise<Record<MarginPoolParamKey | MarginPoolWithSupplierCapParamKey, number>>;

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
  ): Promise<Record<MarginPoolParamKey | MarginPoolWithSupplierCapParamKey, number> | Transaction> {
     // Add all parameter calls to the transaction
    MARGIN_POOL_PARAM_KEYS.forEach((paramKey) => this.#addParamCall(tx, paramKey, coinKey));

    // 2) Add parameters that require supplierCap
    if (supplierCapId) {
      MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS.forEach((paramKey) =>
        this.#addParamCall(tx, paramKey, coinKey, supplierCapId)
      );
    }

    // 3) If inspect is disabled, return the built transaction
    if (!inspect) return tx;

    // 4) Perform devInspect and decode results
    const allKeys: (MarginPoolParamKey | MarginPoolWithSupplierCapParamKey)[] = [
      ...MARGIN_POOL_PARAM_KEYS,
      ...MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS,
    ];

    const inspectResult = await this.suiClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: this.dbConfig.address,
    });

    return this.#formatResult(
      this.#parseInspectResultToBcsStructs(inspectResult, allKeys),
      coinKey
    );
  }
}
