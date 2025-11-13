import { DeepBookConfig, MarginPoolContract } from '@mysten/deepbook-v3';
import { DevInspectResults, getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import {
  MARGIN_POOL_PARAM_KEY_STRUCT_MAP,
  MARGIN_POOL_PARAM_KEYS,
  MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS,
} from '../testnet-config';
import { bcs } from '@mysten/sui/bcs';
import { TESTNET_COINS, TESTNET_MARGIN_POOLS, TESTNET_POOLS } from '../testnet-config';

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
    readonly env: 'testnet' | 'mainnet' = 'testnet',
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
    supplierCap: string
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
  #parseInspectResultToBcsStructs(inspectResults: DevInspectResults, keys: MarginPoolParamKey[]) {
    return keys.reduce(
      (acc, key, idx) => {
        // Raw bytes returned from devInspect
        const bytes = inspectResults.results![idx]!.returnValues![0]![0];

        // Decode bytes according to struct map
        const fn = bcs[MARGIN_POOL_PARAM_KEY_STRUCT_MAP[key]];
        acc[key] = String(fn.parse(new Uint8Array(bytes)));

        return acc;
      },
      {} as Record<string, string>
    );
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * Fetch all margin pool parameters for a given coin key.
   *
   * @param coinKey - Identifier of the asset/coin.
   * @param tx - Optional existing transaction to append calls into.
   * @param inspect - If true, performs devInspect and returns parsed values.
   *
   * @returns Parsed parameter values (if inspect = true), or Transaction if inspect = false.
   */
  async getPoolParameters(
    coinKey: string,
    tx: Transaction = new Transaction(),
    inspect: boolean = true
  ) {
    // Add all parameter calls to the transaction
    MARGIN_POOL_PARAM_KEYS.forEach((paramKey) => this.#addParamCall(tx, paramKey, coinKey));

    // If inspect is disabled, return the built transaction
    if (!inspect) return tx;

    // Perform devInspect and decode results
    return this.#parseInspectResultToBcsStructs(
      await this.suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: this.dbConfig.address,
      }),
      [...MARGIN_POOL_PARAM_KEYS]
    );
  }

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
  async getPoolParametersWithSupplyCap(
    coinKey: string,
    supplierCapId: string,
    tx: Transaction = new Transaction(),
    inspect: boolean = true
  ) {
    // Add normal parameters (no inspect)
    this.getPoolParameters(coinKey, tx, false);

    // Add parameters that require supplierCap
    MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS.forEach((paramKey) =>
      this.#addParamCall(tx, paramKey, coinKey, supplierCapId)
    );

    // If inspect is disabled, return the built transaction
    if (!inspect) return tx;

    // Perform devInspect and decode results
    return this.#parseInspectResultToBcsStructs(
      await this.suiClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: this.dbConfig.address,
      }),
      [...MARGIN_POOL_PARAM_KEYS]
    );
  }
}
