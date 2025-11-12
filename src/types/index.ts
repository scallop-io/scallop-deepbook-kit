/**
 * Type definitions for Scallop DeepBook Kit
 */

export interface Config {
  network: 'mainnet' | 'testnet' | 'devnet';
  rpcUrl?: string;
}

export interface PoolInfo {
  poolId: string;
  baseAsset: string;
  quoteAsset: string;
}
