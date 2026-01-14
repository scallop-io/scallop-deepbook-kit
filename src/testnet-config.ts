/**
 * DeepBook V3 & Margin Testnet Configuration | DeepBook V3 & Margin 測試網配置
 * Source | 來源: https://github.com/MystenLabs/ts-sdks/tree/main/packages/deepbook-v3
 * Document | 文件: https://docs.google.com/document/d/1UQw2JZ3X3UN4641_WkvqdCehP7jDPgFmgt2KFti6bjs
 * Last updated | 最後更新: 2025-11-20
 */

// ============================================================================
// Package IDs
// ============================================================================

export const TESTNET_PACKAGES = {
  DEEPBOOK_PACKAGE_ID: '0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982',
  REGISTRY_ID: '0x7c256edbda983a2cd6f946655f4bf3f00a41043993781f8674a7046e8c0e11d1',
  // DEEP_TREASURY_ID: '0x69fffdae0075f8f71f4fa793549c11079266910e8905169845af1f5d00e09dcb',
  MARGIN_PACKAGE_ID: '0x7f2d8f15343f210e813595a8798d6197d152061d0a35be938372f4b1cd66f209',
  MARGIN_OBJECT: {
    V1: '0x7f2d8f15343f210e813595a8798d6197d152061d0a35be938372f4b1cd66f209',
  },
  MARGIN_REGISTRY_ID: '0x31b9086767e9b5925cb29414ea623a7705b5600d9594d88c17c7a011cb499ab4',
} as const;

// ============================================================================
// Coin Configuration | 代幣配置
// ============================================================================

export const TESTNET_COINS = {
  DEEP: {
    address: '0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8',
    type: '0x36dbef866a1d62bf7328989a10fb2f07d769f4ee587c0de4a0a256e57e0a58a8::deep::DEEP',
    scalar: 1_000_000,
    decimals: 6,
  },
  SUI: {
    address: '0x0000000000000000000000000000000000000000000000000000000000000002',
    type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    scalar: 1_000_000_000,
    decimals: 9,
  },
  DBUSDC: {
    address: '0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7',
    type: '0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC',
    scalar: 1_000_000,
    decimals: 6,
  },
  DBUSDT: {
    address: '0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7',
    type: '0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDT::DBUSDT',
    scalar: 1_000_000,
    decimals: 6,
  },
  WAL: {
    address: '0x9ef7676a9f81937a52ae4b2af8d511a28a0b080477c0c2db40b0ab8882240d76',
    type: '0x9ef7676a9f81937a52ae4b2af8d511a28a0b080477c0c2db40b0ab8882240d76::wal::WAL',
    scalar: 1_000_000_000,
    decimals: 9,
  },
} as const;

// ============================================================================
// Trading Pool Configuration | 交易池配置
// ============================================================================

export const TESTNET_POOLS = {
  DEEP_SUI: {
    // Actual pool address on testnet (verified 2025-11-11) | 實際存在於 testnet 上的 Pool 地址（2025-11-11 驗證）
    address: '0x48c95963e9eac37a316b7ae04a0deb761bcdcc2b67912374d6036e7f0e9bae9f',
    baseCoin: 'DEEP',
    quoteCoin: 'SUI',
    lotSize: 1_000_000, // 1 DEEP (6 decimals) | 1 DEEP（6 位小數）
    tickSize: 1_000_000, // 0.001 SUI (9 decimals) | 0.001 SUI（9 位小數）
  },
  SUI_DBUSDC: {
    // Actual pool address on testnet (verified 2025-11-11) | 實際存在於 testnet 上的 Pool 地址（2025-11-11 驗證）
    address: '0x1c19362ca52b8ffd7a33cee805a67d40f31e6ba303753fd3a4cfdfacea7163a5',
    baseCoin: 'SUI',
    quoteCoin: 'DBUSDC',
    lotSize: 1_000_000, // 0.001 SUI (9 decimals) | 0.001 SUI（9 位小數）
    tickSize: 1_000, // 0.001 DBUSDC (6 decimals) | 0.001 DBUSDC（6 位小數）
  },
  DEEP_DBUSDC: {
    // Actual pool address on testnet (verified 2025-11-11) | 實際存在於 testnet 上的 Pool 地址（2025-11-11 驗證）
    address: '0xe86b991f8632217505fd859445f9803967ac84a9d4a1219065bf191fcb74b622',
    baseCoin: 'DEEP',
    quoteCoin: 'DBUSDC',
    lotSize: 1_000_000, // 1 DEEP (6 decimals) | 1 DEEP（6 位小數）
    tickSize: 1_000, // 0.001 DBUSDC (6 decimals) | 0.001 DBUSDC（6 位小數）
  },
  DBUSDT_DBUSDC: {
    // Actual pool address on testnet (verified 2025-11-11) | 實際存在於 testnet 上的 Pool 地址（2025-11-11 驗證）
    address: '0x83970bb02e3636efdff8c141ab06af5e3c9a22e2f74d7f02a9c3430d0d10c1ca',
    baseCoin: 'DBUSDT',
    quoteCoin: 'DBUSDC',
    lotSize: 1_000_000, // 1 DBUSDT (6 decimals) | 1 DBUSDT（6 位小數）
    tickSize: 1_000, // 0.001 DBUSDC (6 decimals) | 0.001 DBUSDC（6 位小數）
  },
  WAL_DBUSDC: {
    // Actual pool address on testnet (verified 2025-11-11) | 實際存在於 testnet 上的 Pool 地址（2025-11-11 驗證）
    address: '0xeb524b6aea0ec4b494878582e0b78924208339d360b62aec4a8ecd4031520dbb',
    baseCoin: 'WAL',
    quoteCoin: 'DBUSDC',
    lotSize: 1_000_000, // 0.001 WAL (9 decimals) | 0.001 WAL（9 位小數）
    tickSize: 1_000, // 0.001 DBUSDC (6 decimals) | 0.001 DBUSDC（6 位小數）
  },
  WAL_SUI: {
    // Actual pool address on testnet (verified 2025-11-11) | 實際存在於 testnet 上的 Pool 地址（2025-11-11 驗證）
    address: '0x8c1c1b186c4fddab1ebd53e0895a36c1d1b3b9a77cd34e607bef49a38af0150a',
    baseCoin: 'WAL',
    quoteCoin: 'SUI',
    lotSize: 1_000_000, // 0.001 WAL (9 decimals) | 0.001 WAL（9 位小數）
    tickSize: 1_000_000, // 0.001 SUI (9 decimals) | 0.001 SUI（9 位小數）
  },
} as const;

// ============================================================================
// Margin Pool Configuration | Margin 池配置
// ============================================================================

export const TESTNET_MARGIN_POOLS = {
  SUI: {
    // Actual margin pool address on testnet (updated 2025-11-20) | 實際存在於 testnet 上的 Margin Pool 地址（2025-11-20 更新）
    address: '0xe620d6a5390e57e88baff18af89383130d4210eb496a024edcd62f270a655af7',
    coinType: '0x2::sui::SUI',
    initialVersion: 658877881,
    supplyCap: 1000000, // 供應上限 | Supply cap
    maxUtilizationRate: 0.9, // 最大使用率 | Max utilization rate
    referralSpread: 0.1, // Referral spread
    minBorrow: 0.1, // 最小借款額 | Min borrow amount
  },
  DBUSDC: {
    // Actual margin pool address on testnet (updated 2025-11-20) | 實際存在於 testnet 上的 Margin Pool 地址（2025-11-20 更新）
    address: '0xfd0dc290a120ad6c534507614d4dc0b2e78baab649c35bfacbaec2ce18140b69',
    coinType: '0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC',
    initialVersion: 658877215,
    supplyCap: 1000000, // 供應上限 | Supply cap
    maxUtilizationRate: 0.95, // 最大使用率 | Max utilization rate
    referralSpread: 0.1, // Referral spread
    minBorrow: 0.1, // 最小借款額 | Min borrow amount
  },
} as const;

// ============================================================================
// Risk Parameters Configuration | 風險參數配置
// ============================================================================

/**
 * Risk parameters for trading pairs | 交易對的風險參數
 */
export const TESTNET_RISK_PARAMETERS = {
  SUI_DBUSDC: {
    minWithdrawRiskRatio: 2, // 最小提款風險比率 | Min withdraw risk ratio
    minBorrowRiskRatio: 1.25, // 最小借款風險比率 | Min borrow risk ratio
    liquidationRiskRatio: 1.1, // 清算風險比率 | Liquidation risk ratio
    targetLiquidationRiskRatio: 1.25, // 目標清算風險比率 | Target liquidation risk ratio
    userLiquidationReward: 0.03, // 用戶清算獎勵 | User liquidation reward (3%)
    poolLiquidationReward: 0.02, // 池子清算獎勵 | Pool liquidation reward (2%)
  },
} as const;

// ============================================================================
// Pyth Oracle Configuration | Pyth Oracle 配置
// ============================================================================

export const TESTNET_PYTH = {
  pythStateId: '0x243759059f4c3111179da5878c12f68d612c21a8d54d85edc86164bb18be1c7c',
  wormholeStateId: '0x31358d198147da50db32eda2562951d53973a0c0ad5ed738e9b17d88b213d790',
} as const;

// ============================================================================
// Pool Keys (SDK shorthand) | Pool Keys（SDK 使用的簡寫）
// ============================================================================

export const TESTNET_POOL_KEYS = [
  'DEEP_SUI',
  'SUI_DBUSDC',
  'DEEP_DBUSDC',
  'DBUSDT_DBUSDC',
  'WAL_DBUSDC',
  'WAL_SUI',
] as const;

export type TestnetPoolKey = (typeof TESTNET_POOL_KEYS)[number];

// ============================================================================
// Margin Pool Contract Parameter Keys | Margin Pool 合約參數鍵
// ============================================================================

export const MARGIN_POOL_PARAM_KEYS = [
  'supplyCap',
  'maxUtilizationRate',
  'protocolSpread',
  'minBorrow',
  'interestRate',
  'totalSupply',
  'supplyShares',
  'totalBorrow',
  'borrowShares',
  'lastUpdateTimestamp',
] as const;

export const MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS = [
  'userSupplyShares',
  'userSupplyAmount',
] as const;

export const MARGIN_POOL_PARAM_KEY_STRUCT_MAP = {
  supplyCap: 'U64',
  maxUtilizationRate: 'U64',
  protocolSpread: 'U64',
  minBorrow: 'U64',
  interestRate: 'U64',
  totalSupply: 'U64',
  supplyShares: 'U64',
  totalBorrow: 'U64',
  borrowShares: 'U64',
  lastUpdateTimestamp: 'U64',
  userSupplyShares: 'U64',
  userSupplyAmount: 'U64',
} as Record<
  (typeof MARGIN_POOL_PARAM_KEYS)[number] | (typeof MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS)[number],
  'U64'
>;

// ============================================================================
// Utility Functions | 輔助函數
// ============================================================================

/**
 * Get full pool configuration | 取得 Pool 的完整配置
 */
export function getPoolConfig(poolKey: TestnetPoolKey) {
  return TESTNET_POOLS[poolKey];
}

/**
 * Get full coin configuration | 取得代幣的完整配置
 */
export function getCoinConfig(coinSymbol: keyof typeof TESTNET_COINS) {
  return TESTNET_COINS[coinSymbol];
}

/**
 * Format coin amount (convert from smallest unit to human-readable) | 格式化代幣數量（從最小單位轉換為人類可讀）
 */
export function formatCoinAmount(
  amount: number | bigint,
  coinSymbol: keyof typeof TESTNET_COINS
): string {
  const config = TESTNET_COINS[coinSymbol];
  const value = Number(amount) / config.scalar;
  return value.toFixed(config.decimals);
}

/**
 * Parse coin amount (convert from human-readable to smallest unit) | 解析代幣數量（從人類可讀轉換為最小單位）
 */
export function parseCoinAmount(amount: number, coinSymbol: keyof typeof TESTNET_COINS): number {
  const config = TESTNET_COINS[coinSymbol];
  return Math.floor(amount * config.scalar);
}
