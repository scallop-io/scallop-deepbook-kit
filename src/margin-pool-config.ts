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

export type MarginPoolParamKey = (typeof MARGIN_POOL_PARAM_KEYS)[number];
export type MarginPoolWithSupplierCapParamKey =
  (typeof MARGIN_POOL_W_SUPPLIER_CAP_PARAM_KEYS)[number];
