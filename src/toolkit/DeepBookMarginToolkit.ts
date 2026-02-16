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
    // Initialize SuiGrpcClient | 初始化 SuiGrpcClient
    const baseUrl = fullnodeUrl ?? getGrpcFullnodeUrl(network);
    this.suiClient = new SuiGrpcClient({ baseUrl, network });

    // Initialize keypair | 初始化密鑰對
    this.keypair = this.#parseSecretKey(privateKey);
    this.address = this.keypair.getPublicKey().toSuiAddress();

    // Store Supplier Cap ID if provided | 儲存 Supplier Cap ID（如果提供）
    this.supplierCapId = supplierCapId;

    // Create DeepBookConfig | 創建 DeepBookConfig
    this.dbConfig =
      dbConfig ??
      new DeepBookConfig({
        network,
        address: this.address,
      });

    // Initialize MarginPoolContract | 初始化 MarginPoolContract
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

      const txBytes = await tx.build({ client: this.suiClient });
      const { signature } = await this.keypair.signTransaction(txBytes);

      const result = await this.suiClient.core.executeTransaction({
        transaction: txBytes,
        signatures: [signature],
        include: {
          effects: true,
          objectTypes: true,
        },
      });

      const txResult =
        result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
      if (!txResult?.effects.status.success) {
        throw new Error(`Transaction failed: ${txResult?.effects.status.error || 'Unknown error'}`);
      }

      // Find created Supplier Cap from changedObjects | 從 changedObjects 中找到創建的 Supplier Cap
      if (txResult.effects.changedObjects) {
        for (const change of txResult.effects.changedObjects) {
          const objectType = txResult.objectTypes?.[change.objectId];
          if (!change.inputDigest && objectType?.includes('SupplierCap')) {
            return change.objectId;
          }
        }
      }

      return null;
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

      const txBytes = await tx.build({ client: this.suiClient });
      const { signature } = await this.keypair.signTransaction(txBytes);

      const result = await this.suiClient.core.executeTransaction({
        transaction: txBytes,
        signatures: [signature],
        include: {
          effects: true,
          objectTypes: true,
        },
      });

      const txResult =
        result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
      if (!txResult?.effects.status.success) {
        throw new Error(`Transaction failed: ${txResult?.effects.status.error || 'Unknown error'}`);
      }

      // Find created Referral from changedObjects | 從 changedObjects 中找到創建的 Referral
      if (txResult.effects.changedObjects) {
        for (const change of txResult.effects.changedObjects) {
          const objectType = txResult.objectTypes?.[change.objectId];
          if (!change.inputDigest && objectType?.includes('SupplyReferral')) {
            return change.objectId;
          }
        }
      }

      return null;
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
      if (!this.supplierCapId) {
        throw new Error('Supplier Cap not initialized. Call initialize() first.');
      }

      const tx = new Transaction();
      tx.setSender(this.address);

      const supplierCap = tx.object(this.supplierCapId);

      // SDK automatically handles unit conversion | SDK 自動處理單位轉換
      tx.add(this.marginPoolContract.supplyToMarginPool(coin, supplierCap, amount, referralId));

      const txBytes = await tx.build({ client: this.suiClient });
      const { signature } = await this.keypair.signTransaction(txBytes);

      const result = await this.suiClient.core.executeTransaction({
        transaction: txBytes,
        signatures: [signature],
        include: {
          effects: true,
        },
      });

      const txResult =
        result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
      if (!txResult?.effects.status.success) {
        throw new Error(`Transaction failed: ${txResult?.effects.status.error || 'Unknown error'}`);
      }
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
      if (!this.supplierCapId) {
        throw new Error('Supplier Cap not initialized. Call initialize() first.');
      }

      const tx = new Transaction();
      tx.setSender(this.address);

      const supplierCap = tx.object(this.supplierCapId);

      // Call withdrawFromMarginPool | 調用 withdrawFromMarginPool
      const withdrawFunc = this.marginPoolContract.withdrawFromMarginPool(
        coin,
        supplierCap,
        amount
      );

      const withdrawnCoin = withdrawFunc(tx);

      // Transfer withdrawn coin to sender | 將提取的 coin 轉給發送者
      tx.transferObjects([withdrawnCoin], this.address);

      const txBytes = await tx.build({ client: this.suiClient });
      const { signature } = await this.keypair.signTransaction(txBytes);

      const result = await this.suiClient.core.executeTransaction({
        transaction: txBytes,
        signatures: [signature],
        include: {
          effects: true,
        },
      });

      const txResult =
        result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
      if (!txResult?.effects.status.success) {
        throw new Error(`Transaction failed: ${txResult?.effects.status.error || 'Unknown error'}`);
      }

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

      // Add withdrawReferralFees call | 添加 withdrawReferralFees 調用
      tx.add(this.marginPoolContract.withdrawReferralFees(coin, referralId));

      const txBytes = await tx.build({ client: this.suiClient });
      const { signature } = await this.keypair.signTransaction(txBytes);

      const result = await this.suiClient.core.executeTransaction({
        transaction: txBytes,
        signatures: [signature],
        include: {
          effects: true,
          balanceChanges: true,
        },
      });

      const txResult =
        result.$kind === 'Transaction' ? result.Transaction : result.FailedTransaction;
      if (!txResult?.effects.status.success) {
        throw new Error(`Transaction failed: ${txResult?.effects.status.error || 'Unknown error'}`);
      }
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
      if (!this.supplierCapId) {
        throw new Error('Supplier Cap not initialized. Call initialize() first.');
      }

      // Query user supply amount in margin pool | 查詢用戶在 margin pool 中的供應量
      const tx = new Transaction();
      tx.setSender(this.address);
      tx.add(this.marginPoolContract.userSupplyAmount(coin, this.supplierCapId));

      const txBytes = await tx.build({ client: this.suiClient });
      const result = await this.suiClient.core.simulateTransaction({
        transaction: txBytes,
        include: {
          commandResults: true,
        },
      });

      let userSupplyAmount = 0;

      const commandResults = result.commandResults;
      if (commandResults && commandResults[0]) {
        const returnValue = commandResults[0].returnValues?.[0];
        if (returnValue?.bcs) {
          const rawAmount = Buffer.from(returnValue.bcs).readBigUInt64LE();
          // Convert from smallest unit to human-readable | 從最小單位轉換為人類可讀
          const scalar = this.dbConfig.getCoin(coin).scalar;
          userSupplyAmount = Number(rawAmount) / scalar;
        }
      }

      // Query wallet balance | 查詢錢包餘額
      const coinType = this.dbConfig.getCoin(coin).type;
      const balance = await this.suiClient.core.getBalance({
        owner: this.address,
        coinType,
      });

      const scalar = this.dbConfig.getCoin(coin).scalar;
      const walletBalance = Number(balance.balance) / scalar;

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
