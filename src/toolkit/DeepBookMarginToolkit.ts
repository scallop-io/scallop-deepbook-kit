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

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { MarginPoolContract, DeepBookConfig } from '@mysten/deepbook-v3';
import { TESTNET_COINS, TESTNET_POOLS, TESTNET_MARGIN_POOLS } from '../testnet-config';
import { ToolkitConfig, MarginCoinType, MarginBalance } from './types';
import { decodeSuiPrivateKey, SUI_PRIVATE_KEY_PREFIX } from '@mysten/sui/cryptography';
import { hexOrBase64ToUint8Array, normalizePrivateKey } from '../utils/private-key';

/**
 * Main DeepBook Margin Toolkit class | DeepBook Margin Toolkit 主類別
 */
export class DeepBookMarginToolkit {
  private suiClient: SuiClient;
  private keypair: Ed25519Keypair;
  private address: string;
  private marginPoolContract: MarginPoolContract;
  private supplierCapId?: string;

  constructor(config: ToolkitConfig) {
    // Initialize SuiClient | 初始化 SuiClient
    const rpcUrl = config.fullnodeUrl ?? getFullnodeUrl(config.network);
    this.suiClient = new SuiClient({ url: rpcUrl });

    // Initialize keypair | 初始化密鑰對
    this.keypair = this.#parseSecretKey(config.privateKey);
    this.address = this.keypair.getPublicKey().toSuiAddress();

    // Store Supplier Cap ID if provided | 儲存 Supplier Cap ID（如果提供）
    this.supplierCapId = config.supplierCapId;

    // Prepare coins configuration | 準備 coins 配置
    const coins = {
      DEEP: {
        address: TESTNET_COINS.DEEP.address,
        type: TESTNET_COINS.DEEP.type,
        scalar: TESTNET_COINS.DEEP.scalar,
      },
      SUI: {
        address: TESTNET_COINS.SUI.address,
        type: TESTNET_COINS.SUI.type,
        scalar: TESTNET_COINS.SUI.scalar,
      },
      DBUSDC: {
        address: TESTNET_COINS.DBUSDC.address,
        type: TESTNET_COINS.DBUSDC.type,
        scalar: TESTNET_COINS.DBUSDC.scalar,
      },
    };

    // Prepare pools configuration | 準備 pools 配置
    const pools = {
      SUI_DBUSDC: {
        address: TESTNET_POOLS.SUI_DBUSDC.address,
        baseCoin: TESTNET_POOLS.SUI_DBUSDC.baseCoin,
        quoteCoin: TESTNET_POOLS.SUI_DBUSDC.quoteCoin,
      },
    };

    // Prepare margin pools configuration | 準備 margin pools 配置
    const marginPools = {
      SUI: {
        address: TESTNET_MARGIN_POOLS.SUI.address,
        type: TESTNET_MARGIN_POOLS.SUI.coinType,
      },
      DBUSDC: {
        address: TESTNET_MARGIN_POOLS.DBUSDC.address,
        type: TESTNET_MARGIN_POOLS.DBUSDC.coinType,
      },
    };

    // Create DeepBookConfig | 創建 DeepBookConfig
    const deepbookConfig = new DeepBookConfig({
      address: this.address,
      env: config.network,
      coins,
      pools,
      marginPools,
    });

    // Initialize MarginPoolContract | 初始化 MarginPoolContract
    this.marginPoolContract = new MarginPoolContract(deepbookConfig);
  }

  #parseSecretKey(secretKey: string): Ed25519Keypair {
    if (secretKey.startsWith(SUI_PRIVATE_KEY_PREFIX)) {
      const { secretKey: uint8ArraySecretKey } = decodeSuiPrivateKey(secretKey);
      return Ed25519Keypair.fromSecretKey(normalizePrivateKey(uint8ArraySecretKey));
    }

    return Ed25519Keypair.fromSecretKey(normalizePrivateKey(hexOrBase64ToUint8Array(secretKey)));
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

      // Use MarginPoolContract to create Supplier Cap | 使用 MarginPoolContract 創建 Supplier Cap
      this.marginPoolContract.mintSupplierCap()(tx);

      const result = await this.suiClient.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      // Find created Supplier Cap from objectChanges | 從 objectChanges 中找到創建的 Supplier Cap
      if (result.objectChanges) {
        for (const change of result.objectChanges) {
          if (change.type === 'created' && change.objectType.includes('SupplierCap')) {
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

      // Use MarginPoolContract to create supply Referral | 使用 MarginPoolContract 創建供應 Referral
      this.marginPoolContract.mintSupplyReferral(coin)(tx);

      const result = await this.suiClient.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      // Find created Referral from objectChanges | 從 objectChanges 中找到創建的 Referral
      if (result.objectChanges) {
        for (const change of result.objectChanges) {
          if (change.type === 'created' && change.objectType.includes('SupplyReferral')) {
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

      await this.suiClient.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

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

      await this.suiClient.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

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

      // Add withdrawReferralFees call | 添加 withdrawReferralFees 調用
      tx.add(this.marginPoolContract.withdrawReferralFees(coin, referralId));

      await this.suiClient.signAndExecuteTransaction({
        signer: this.keypair,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        },
      });

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
      tx.add(this.marginPoolContract.userSupplyAmount(coin, this.supplierCapId));

      const result = await this.suiClient.devInspectTransactionBlock({
        sender: this.address,
        transactionBlock: tx,
      });

      let userSupplyAmount = 0;

      if (result && result.results && result.results[0] && result.results[0].returnValues) {
        const supplyData = result.results[0].returnValues[0];
        if (supplyData && supplyData[0]) {
          const rawAmount = Buffer.from(supplyData[0]).readBigUInt64LE();
          // Convert from smallest unit to human-readable | 從最小單位轉換為人類可讀
          const scalar = coin === 'SUI' ? TESTNET_COINS.SUI.scalar : TESTNET_COINS.DBUSDC.scalar;
          userSupplyAmount = Number(rawAmount) / scalar;
        }
      }

      // Query wallet balance | 查詢錢包餘額
      const coinType = coin === 'SUI' ? TESTNET_COINS.SUI.type : TESTNET_COINS.DBUSDC.type;
      const balance = await this.suiClient.getBalance({
        owner: this.address,
        coinType,
      });

      const scalar = coin === 'SUI' ? TESTNET_COINS.SUI.scalar : TESTNET_COINS.DBUSDC.scalar;
      const walletBalance = Number(balance.totalBalance) / scalar;

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