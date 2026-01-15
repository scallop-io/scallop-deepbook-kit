// ============================================================================
// Package IDs
// ============================================================================
export const MAINNET_PACKAGES = {
  DEEPBOOK_PACKAGE_ID: '0x37f187e1e54e9c9b8c78b6c46a7281f644ebc62e75493623edcaa6d1dfcf64d2',
  REGISTRY_ID: '0xaf16199a2dff736e9f07a845f23c5da6df6f756eddb631aed9d24a93efc4549d',
  // DEEP_TREASURY_ID: '0x69fffdae0075f8f71f4fa793549c11079266910e8905169845af1f5d00e09dcb',
  MARGIN_PACKAGE_ID: '0x97d9473771b01f77b0940c589484184b49f6444627ec121314fae6a6d36fb86b',
  MARGIN_OBJECT: {
    V1: '0x97d9473771b01f77b0940c589484184b49f6444627ec121314fae6a6d36fb86b',
  },
  MARGIN_REGISTRY_ID: '0x0e40998b359a9ccbab22a98ed21bd4346abf19158bc7980c8291908086b3a742',
} as const;

// ============================================================================
// Margin Pool Configuration | Margin 池配置
// ============================================================================

export const MAINNET_MARGIN_POOLS = {
  SUI: {
    address: '0x53041c6f86c4782aabbfc1d4fe234a6d37160310c7ee740c915f0a01b7127344',
    type: '0x2::sui::SUI',
    initialSharedVersion: 658877881,
  },
  DBUSDC: {
    address: '0xfd0dc290a120ad6c534507614d4dc0b2e78baab649c35bfacbaec2ce18140b69',
    type: '0xf7152c05930480cd740d7311b5b8b45c6f488e3a53a11c3f74a6fac36a52e0d7::DBUSDC::DBUSDC',
    initialSharedVersion: 658877215,
  },
} as const;

// ============================================================================
// Trading Pool Configuration | 交易池配置
// ============================================================================

export const MAINNET_POOLS = {
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
// Coin Configuration | 代幣配置
// ============================================================================

export const MAINNET_COINS = {
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
// Pool Keys (SDK shorthand) | Pool Keys（SDK 使用的簡寫）
// ============================================================================

export const MAINNET_POOL_KEYS = [
  'DEEP_SUI',
  'SUI_DBUSDC',
  'DEEP_DBUSDC',
  'DBUSDT_DBUSDC',
  'WAL_DBUSDC',
  'WAL_SUI',
] as const;

export const MAINNET_COIN_KEYS = ['DEEP', 'SUI', 'DBUSDC', 'DBUSDT', 'WAL'] as const;

export type MainnetPoolKey = (typeof MAINNET_POOL_KEYS)[number];
export type MainnetCoinKey = (typeof MAINNET_COIN_KEYS)[number];
