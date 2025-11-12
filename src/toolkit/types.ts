/**
 * Type definitions for DeepBook Margin Toolkit | DeepBook Margin Toolkit 類型定義
 */

// ============================================================================
// Network & Configuration Types | 網路與配置類型
// ============================================================================

/**
 * Supported network types | 支援的網路類型
 */
export type NetworkType = 'testnet' | 'mainnet';

/**
 * Supported coin types for Margin operations | Margin 操作支援的幣種
 */
export type MarginCoinType = 'SUI' | 'DBUSDC';

/**
 * Toolkit initialization configuration | Toolkit 初始化配置
 */
export interface ToolkitConfig {
  /** Network type: testnet or mainnet | 網路類型：測試網或主網 */
  network: NetworkType;

  /** Private key in hex format (without 0x prefix) | 私鑰（hex 格式，不含 0x 前綴） */
  privateKey: string;

  /** Optional: existing Supplier Cap ID | 可選：現有的 Supplier Cap ID */
  supplierCapId?: string;
}

/**
 * Transaction result | 交易結果
 */
export interface TransactionResult {
  /** Transaction digest | 交易摘要 */
  digest: string;

  /** Transaction status | 交易狀態 */
  status: string;

  /** Created object ID (if applicable) | 創建的物件 ID（如適用） */
  objectId?: string;
}

/**
 * Margin balance information | Margin 餘額資訊
 */
export interface MarginBalance {
  /** User's supply amount in the margin pool | 用戶在 margin pool 中的供應量 */
  userSupplyAmount: number;

  /** User's wallet balance | 用戶錢包餘額 */
  walletBalance: number;
}

/**
 * Referral information | Referral 資訊
 */
export interface ReferralInfo {
  /** Referral Object ID | Referral 物件 ID */
  referralId: string;

  /** Coin type | 幣種 */
  coin: MarginCoinType;

  /** Owner address | 擁有者地址 */
  owner: string;
}
