/**
 * DeepBook Margin Toolkit - Main Export | DeepBook Margin Toolkit - 主導出文件
 *
 * @example
 * ```typescript
 * import { DeepBookMarginToolkit } from './toolkit';
 *
 * const toolkit = new DeepBookMarginToolkit({
 *   network: 'testnet',
 *   privateKey: process.env.PRIVATE_KEY!,
 * });
 *
 * await toolkit.initialize();
 * await toolkit.supplyToMarginPool('SUI', 0.1);
 * ```
 */

export { DeepBookMarginToolkit } from './DeepBookMarginToolkit.js';
export { DeepBookMarginPool, type MarginPoolParams } from './DeepBookMarginPool.js';

export type {
  NetworkType,
  MarginCoinType,
  ToolkitConfig,
  TransactionResult,
  MarginBalance,
  ReferralInfo,
} from './types.js';
