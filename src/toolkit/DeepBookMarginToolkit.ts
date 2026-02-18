/**
 * DeepBook Margin Toolkit | DeepBook Margin 工具包
 *
 * Simple and unified API for DeepBook Margin operations | 簡潔統一的 DeepBook Margin 操作 API
 *
 * @example
 * ```typescript
 * // Initialize toolkit | 初始化工具包
 * const toolkit = new DeepBookMarginToolkit({
 *   network: 'testnet',
 *   privateKey: process.env.PRIVATE_KEY!,
 * });
 *
 * // Initialize (creates Supplier Cap if needed) | 初始化（需要時創建 Supplier Cap）
 * await toolkit.initialize();
 *
 * // Create referral | 創建 referral
 * const referralId = await toolkit.createSupplyReferral('SUI');
 *
 * // Supply to margin pool | 供應資金到 margin pool
 * await toolkit.supplyToMarginPool('SUI', 0.1, referralId);
 *
 * // Withdraw from margin pool | 從 margin pool 提取
 * await toolkit.withdrawFromMarginPool('SUI');
 *
 * // Withdraw referral fees | 提取 referral 費用
 * await toolkit.withdrawReferralFees('SUI', referralId);
 *
 * // Get balance | 查詢餘額
 * const balance = await toolkit.getBalance('SUI');
 * ```
 */

import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { MarginPoolContract, DeepBookConfig } from '@mysten/deepbook-v3';
import { ToolkitConfig, MarginCoinType, MarginBalance } from './types.js';
import { decodeSuiPrivateKey, SUI_PRIVATE_KEY_PREFIX } from '@mysten/sui/cryptography';
import { hexOrBase64ToUint8Array, normalizePrivateKey } from '../utils/private-key.js';
import { getGrpcFullnodeUrl } from '../utils/network.js';

interface ExecuteOptions {
  includeObjectTypes?: boolean;
  includeBalanceChanges?: boolean;
}

/**
 * Main DeepBook Margin Toolkit class | DeepBook Margin Toolkit 主類別
 */
export class DeepBookMarginToolkit {
  private suiClient: SuiGrpcClient;
  private keypair: Ed25519Keypair;
  private address: string;
  private marginPoolContract: MarginPoolContract;
  private supplierCapId?: string;
  private dbConfig: DeepBookConfig;
  private supplierCapPackageId: string;

  constructor({
    network,
    fullnodeUrl,
    supplierCapId,
    privateKey,
    supplierCapPackageId,
    dbConfig,
  }: ToolkitConfig) {
    const baseUrl = fullnodeUrl ?? getGrpcFullnodeUrl(network);
    this.suiClient = new SuiGrpcClient({ baseUrl, network });

    this.keypair = this.#parseSecretKey(privateKey);
    this.address = this.keypair.getPublicKey().toSuiAddress();

    this.supplierCapId = supplierCapId;

    this.dbConfig =
      dbConfig ??
      new DeepBookConfig({
        network,
        address: this.address,
      });

    this.marginPoolContract = new MarginPoolContract(this.dbConfig);

    this.supplierCapPackageId = supplierCapPackageId ?? this.dbConfig.MARGIN_PACKAGE_ID;
  }

  #parseSecretKey(secretKey: string): Ed25519Keypair {
    if (secretKey.startsWith(SUI_PRIVATE_KEY_PREFIX)) {
      const { secretKey: uint8ArraySecretKey } = decodeSuiPrivateKey(secretKey);
      return Ed25519Keypair.fromSecretKey(normalizePrivateKey(uint8ArraySecretKey));
    }

    return Ed25519Keypair.fromSecretKey(normalizePrivateKey(hexOrBase64ToUint8Array(secretKey)));
  }

  /**
   * Build, sign, execute a transaction, and validate success.
   */
  async #signAndExecute(tx: Transaction, options: ExecuteOptions = {}) {
    const txBytes = await tx.build({ client: this.suiClient });
    const { signature } = await this.keypair.signTransaction(txBytes);

    const result = await this.suiClient.core.executeTransaction({
      transaction: txBytes,
      signatures: [signature],
      include: {
        effects: true,
        objectTypes: options.includeObjectTypes,
        balanceChanges: options.includeBalanceChanges,
      },
    });

    const txResult = result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
    if (!txResult?.effects.status.success) {
      throw new Error(`Transaction failed: ${txResult?.effects.status.error || 'Unknown error'}`);
    }

    return txResult;
  }

  /**
   * Find a newly created object by type name substring from transaction results.
   * Returns the objectId of the first match, or null if none found.
   */
  #findCreatedObject(
    txResult: { effects: { changedObjects?: any[] }; objectTypes?: Record<string, string> },
    typeSubstring: string
  ): string | null {
    if (!txResult.effects.changedObjects) return null;

    for (const change of txResult.effects.changedObjects) {
      const objectType = txResult.objectTypes?.[change.objectId];
      if (!change.inputDigest && objectType?.includes(typeSubstring)) {
        return change.objectId;
      }
    }

    return null;
  }

  #requireSupplierCap(): string {
    if (!this.supplierCapId) {
      throw new Error('Supplier Cap not initialized. Call initialize() first.');
    }
    return this.supplierCapId;
  }

  // @TODO: Handle more than 1 supplier cap in future
  async #getExistingSupplierCapId() {
    const type = `${this.dbConfig.MARGIN_PACKAGE_ID}::margin_pool::SupplierCap`;
    const resp = await this.suiClient.core.listOwnedObjects({
      owner: this.address,
      type,
    });

    return resp.objects?.[0]?.objectId;
  }

  /**
   * Initialize toolkit (creates Supplier Cap if not exists) | 初始化工具包（如不存在則創建 Supplier Cap）
   * @returns Supplier Cap ID | Supplier Cap ID
   */
  async initialize(): Promise<string> {
    // If Supplier Cap ID already exists, return it | 如果已有 Supplier Cap ID，直接返回
    if (this.supplierCapId) {
      return this.supplierCapId;
    }

    // Try get existing Supplier Cap | 嘗試獲取現有的 Supplier Cap
    const existingCapId = await this.#getExistingSupplierCapId();
    if (existingCapId) {
      this.supplierCapId = existingCapId;
      return existingCapId;
    }

    // Create new Supplier Cap | 創建新的 Supplier Cap
    const capId = await this.createSupplierCap();

    if (!capId) {
      throw new Error('Failed to create Supplier Cap');
    }

    this.supplierCapId = capId;
    return capId;
  }

  /**
   * Create Supplier Cap (supplier credential) | 創建 Supplier Cap（供應者憑證）
   * @returns Supplier Cap ID or null | Supplier Cap ID 或 null
   */
  async createSupplierCap(): Promise<string | null> {
    try {
      const tx = new Transaction();
      tx.setSender(this.address);

      // Direct moveCall to get the returned object reference
      // Based on SDK source: margin_pool::mint_supplier_cap
      const supplierCap = tx.moveCall({
        target: `${this.supplierCapPackageId}::margin_pool::mint_supplier_cap`,
        arguments: [tx.object(this.dbConfig.MARGIN_REGISTRY_ID), tx.object.clock()],
      });

      // Transfer the created Supplier Cap to the sender
      tx.transferObjects([supplierCap], tx.pure.address(this.address));

      const txResult = await this.#signAndExecute(tx, { includeObjectTypes: true });
      return this.#findCreatedObject(txResult, 'SupplierCap');
    } catch (error: any) {
      throw new Error(`Failed to create Supplier Cap: ${error.message || error}`);
    }
  }

  /**
   * Create Supply Referral | 創建供應 Referral
   * @param coin Coin type (SUI or DBUSDC) | 幣種 (SUI 或 DBUSDC)
   * @returns Referral ID or null | Referral ID 或 null
   */
  async createSupplyReferral(coin: MarginCoinType): Promise<string | null> {
    try {
      const tx = new Transaction();
      tx.setSender(this.address);

      // Get margin pool configuration
      const marginPool = this.dbConfig.getMarginPool(coin);
      if (!marginPool) {
        throw new Error(`Margin pool configuration not found for coin: ${coin}`);
      }

      // Use the initialVersion from config as the initial_shared_version
      // Margin pools are shared objects on Sui
      tx.moveCall({
        target: `${this.dbConfig.MARGIN_PACKAGE_ID}::margin_pool::mint_supply_referral`,
        arguments: [
          tx.object(marginPool.address),
          tx.object(this.dbConfig.MARGIN_REGISTRY_ID),
          tx.object.clock(),
        ],
        typeArguments: [marginPool.type],
      });

      const txResult = await this.#signAndExecute(tx, { includeObjectTypes: true });
      return this.#findCreatedObject(txResult, 'SupplyReferral');
    } catch (error: any) {
      throw new Error(`Failed to create Supply Referral: ${error.message || error}`);
    }
  }

  /**
   * Supply funds to Margin Pool | 供應資金到 Margin Pool
   * @param coin Coin type (SUI or DBUSDC) | 幣種 (SUI 或 DBUSDC)
   * @param amount Supply amount (in human-readable units) | 供應金額（以人類可讀單位）
   * @param referralId Optional Referral ID | 可選的 Referral ID
   * @returns Success status | 成功狀態
   */
  async supplyToMarginPool(
    coin: MarginCoinType,
    amount: number,
    referralId?: string
  ): Promise<boolean> {
    try {
      const capId = this.#requireSupplierCap();

      const tx = new Transaction();
      tx.setSender(this.address);

      const supplierCap = tx.object(capId);
      tx.add(this.marginPoolContract.supplyToMarginPool(coin, supplierCap, amount, referralId));

      await this.#signAndExecute(tx);
      return true;
    } catch (error: any) {
      throw new Error(`Failed to supply to margin pool: ${error.message || error}`);
    }
  }

  /**
   * Withdraw funds from Margin Pool | 從 Margin Pool 提取資金
   * @param coin Coin type (SUI or DBUSDC) | 幣種 (SUI 或 DBUSDC)
   * @param amount Withdraw amount (in human-readable units), omit to withdraw all | 提取金額（以人類可讀單位），不指定則提取全部
   * @returns Success status | 成功狀態
   */
  async withdrawFromMarginPool(coin: MarginCoinType, amount?: number): Promise<boolean> {
    try {
      const capId = this.#requireSupplierCap();

      const tx = new Transaction();
      tx.setSender(this.address);

      const supplierCap = tx.object(capId);
      const withdrawFunc = this.marginPoolContract.withdrawFromMarginPool(
        coin,
        supplierCap,
        amount
      );

      const withdrawnCoin = withdrawFunc(tx);
      tx.transferObjects([withdrawnCoin], this.address);

      await this.#signAndExecute(tx);
      return true;
    } catch (error: any) {
      throw new Error(`Failed to withdraw from margin pool: ${error.message || error}`);
    }
  }

  /**
   * Withdraw Referral accumulated fees | 提取 Referral 累積的費用
   * @param coin Coin type (SUI or DBUSDC) | 幣種 (SUI 或 DBUSDC)
   * @param referralId Referral Object ID | Referral 物件 ID
   * @returns Success status | 成功狀態
   */
  async withdrawReferralFees(coin: MarginCoinType, referralId: string): Promise<boolean> {
    try {
      const tx = new Transaction();
      tx.setSender(this.address);

      tx.add(this.marginPoolContract.withdrawReferralFees(coin, referralId));

      await this.#signAndExecute(tx, { includeBalanceChanges: true });
      return true;
    } catch (error: any) {
      throw new Error(`Failed to withdraw referral fees: ${error.message || error}`);
    }
  }

  /**
   * Get margin balance for a coin | 查詢幣種的 margin 餘額
   * @param coin Coin type (SUI or DBUSDC) | 幣種 (SUI 或 DBUSDC)
   * @returns Margin balance information | Margin 餘額資訊
   */
  async getBalance(coin: MarginCoinType): Promise<MarginBalance> {
    try {
      const capId = this.#requireSupplierCap();

      const tx = new Transaction();
      tx.setSender(this.address);
      tx.add(this.marginPoolContract.userSupplyAmount(coin, capId));

      const txBytes = await tx.build({ client: this.suiClient });
      const result = await this.suiClient.core.simulateTransaction({
        transaction: txBytes,
        include: {
          commandResults: true,
        },
      });

      const coinInfo = this.dbConfig.getCoin(coin);
      let userSupplyAmount = 0;

      const commandResults = result.commandResults;
      if (commandResults && commandResults[0]) {
        const returnValue = commandResults[0].returnValues?.[0];
        if (returnValue?.bcs) {
          const rawAmount = Buffer.from(returnValue.bcs).readBigUInt64LE();
          userSupplyAmount = Number(rawAmount) / coinInfo.scalar;
        }
      }

      const balance = await this.suiClient.core.getBalance({
        owner: this.address,
        coinType: coinInfo.type,
      });

      const walletBalance = Number(balance.balance) / coinInfo.scalar;

      return {
        userSupplyAmount,
        walletBalance,
      };
    } catch (error: any) {
      throw new Error(`Failed to get balance: ${error.message || error}`);
    }
  }

  /**
   * Get Supplier Cap ID | 獲取 Supplier Cap ID
   * @returns Supplier Cap ID or undefined | Supplier Cap ID 或 undefined
   */
  getSupplierCapId(): string | undefined {
    return this.supplierCapId;
  }

  /**
   * Get wallet address | 獲取錢包地址
   * @returns Wallet address | 錢包地址
   */
  getAddress(): string {
    return this.address;
  }
}
