/**
 * Configuration management | 配置管理
 *
 * Uses dotenv for environment variable management | 使用 dotenv 進行環境變數管理
 */

import dotenv from 'dotenv';
import { TESTNET_COINS, TESTNET_POOLS } from './testnet-config';
import { MAINNET_COINS, MAINNET_POOLS } from './mainnet-config';
import { PoolMap } from '@mysten/deepbook-v3';

// Initialize dotenv | 初始化 dotenv
dotenv.config();

/**
 * Network configuration interface | 網路配置介面
 */
export interface NetworkConfig {
  /** Network type: testnet or mainnet | 網路類型：測試網或主網 */
  network: 'testnet' | 'mainnet';

  /** Optional custom RPC URL | 可選的自訂 RPC URL */
  rpcUrl?: string;
}

/**
 * Get network configuration from environment variables | 從環境變數取得網路配置
 *
 * @returns Network configuration | 網路配置
 *
 * @example
 * ```typescript
 * const config = getConfig();
 * console.log('Network:', config.network);
 * console.log('RPC URL:', config.rpcUrl);
 * ```
 */
export const getConfig = (): NetworkConfig => {
  const network = (process.env.NETWORK || 'testnet') as 'testnet' | 'mainnet';

  // Validate network value | 驗證網路值
  if (network !== 'testnet' && network !== 'mainnet') {
    console.warn(
      `⚠️  Invalid NETWORK value: ${network}. Using 'testnet' as default. | ` +
        `無效的 NETWORK 值：${network}。使用 'testnet' 作為預設值。`
    );
    return {
      network: 'testnet',
      rpcUrl: process.env.SUI_RPC_URL,
    };
  }

  return {
    network,
    rpcUrl: process.env.SUI_RPC_URL,
  };
};

/**
 * Get private key from environment variables | 從環境變數取得私鑰
 *
 * @returns Private key in hex format | 十六進位格式的私鑰
 * @throws Error if PRIVATE_KEY is not set | 如果 PRIVATE_KEY 未設置則拋出錯誤
 *
 * @example
 * ```typescript
 * const privateKey = getPrivateKey();
 * ```
 */
export const getPrivateKey = (): string => {
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      'PRIVATE_KEY not found in .env file | PRIVATE_KEY 在 .env 檔案中未找到\n' +
        'Please add your private key to the .env file | 請將您的私鑰添加到 .env 檔案中\n' +
        'Example | 範例: PRIVATE_KEY=your_hex_private_key_here'
    );
  }

  // Validate private key format (should be 64 hex characters) | 驗證私鑰格式（應為 64 個十六進位字元）
  const cleanKey = privateKey.replace(/^0x/, ''); // Remove 0x prefix if present | 移除 0x 前綴（如果存在）

  if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
    console.warn(
      '⚠️  Warning: PRIVATE_KEY may not be in correct format | 警告：PRIVATE_KEY 可能格式不正確\n' +
        '   Expected: 64 hexadecimal characters | 預期：64 個十六進位字元\n' +
        '   Example | 範例: a1b2c3d4...(64 characters total)'
    );
  }

  return cleanKey;
};

/**
 * Get all environment configuration | 取得所有環境配置
 *
 * @returns Complete configuration object | 完整的配置物件
 *
 * @example
 * ```typescript
 * const fullConfig = getAllConfig();
 * console.log('Config:', fullConfig);
 * ```
 */
export const getAllConfig = () => {
  return {
    ...getConfig(),
    privateKey: getPrivateKey(),
    supplierCapId: process.env.SUPPLIER_CAP_ID,
    suiReferralId: process.env.SUI_REFERRAL_ID,
    dbusdcReferralId: process.env.DBUSDC_REFERRAL_ID,
  };
};

/**
 * Display current configuration | 顯示當前配置
 *
 * @example
 * ```typescript
 * displayConfig();
 * ```
 */
export const displayConfig = (): void => {
  const config = getConfig();

  console.log('\n⚙️  Configuration | 配置：');
  console.log('━'.repeat(60));
  console.log(`   Network | 網路: ${config.network}`);
  console.log(`   RPC URL: ${config.rpcUrl || '(Using default | 使用預設值)'}`);
  console.log('━'.repeat(60));
  console.log('');
};

// ============================================================================
type Env = 'mainnet' | 'testnet';
const DEFAULT_ENV: Env = 'mainnet';

// 1) Define a shared coin config shape (include only what you actually need)
type CoinConfig = {
  scalar: number;
  decimals: number;
  address?: string;
  type?: string;
  symbol?: string;
};

// 2) Tell TS that both env maps follow this shape
const COINS_BY_ENV: Record<Env, Record<string, CoinConfig>> = {
  mainnet: MAINNET_COINS as Record<string, CoinConfig>,
  testnet: TESTNET_COINS as Record<string, CoinConfig>,
};

const POOLS_BY_ENV: Record<Env, PoolMap> = {
  mainnet: MAINNET_POOLS,
  testnet: TESTNET_POOLS,
};

// ----------------------------------------------------------------------------
// Utility Functions (env optional, default mainnet)
// ----------------------------------------------------------------------------

export function getPoolConfig(poolKey: string, env: Env = DEFAULT_ENV) {
  return POOLS_BY_ENV[env][poolKey];
}

export function getCoinConfig(coinSymbol: string, env: Env = DEFAULT_ENV) {
  return COINS_BY_ENV[env][coinSymbol];
}

export function formatCoinAmount(
  amount: number | bigint,
  coinSymbol: string,
  env: Env = DEFAULT_ENV
): string {
  const config = COINS_BY_ENV[env][coinSymbol];
  if (!config) throw new Error(`Coin config not found for symbol: ${coinSymbol} in env: ${env}`);
  const { scalar, decimals } = config;

  if (typeof amount === 'number') {
    return (amount / scalar).toFixed(decimals);
  }

  // bigint-safe formatting
  const scalarBI = BigInt(scalar);
  const integer = amount / scalarBI;
  const fraction = amount % scalarBI;

  const fracStr = fraction.toString().padStart(decimals, '0');
  return `${integer.toString()}.${fracStr}`;
}

export function parseCoinAmount(
  amount: number,
  coinSymbol: string,
  env: Env = DEFAULT_ENV
): number {
  const config = COINS_BY_ENV[env][coinSymbol];
  if (!config) throw new Error(`Coin config not found for symbol: ${coinSymbol} in env: ${env}`);

  const { scalar } = config;
  return Math.floor(amount * scalar);
}

// recommended on-chain safe parse
export function parseCoinAmountBigInt(
  amount: string | number,
  coinSymbol: string,
  env: Env = DEFAULT_ENV
): bigint {
  const config = COINS_BY_ENV[env][coinSymbol];
  if (!config) throw new Error(`Coin config not found for symbol: ${coinSymbol} in env: ${env}`);

  const { scalar, decimals } = config;
  const [intPart = '0', fracRaw = ''] = String(amount).trim().split('.');
  const frac = fracRaw.slice(0, decimals).padEnd(decimals, '0');

  return BigInt(intPart) * BigInt(scalar) + BigInt(frac || '0');
}
