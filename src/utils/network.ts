/**
 * Network utility functions
 */

import { NetworkType } from '../toolkit/types.js';

/**
 * Get gRPC fullnode URL for a given network
 * @param network Network type (mainnet, testnet)
 * @returns gRPC fullnode URL
 */
export function getGrpcFullnodeUrl(network: NetworkType): string {
  switch (network) {
    case 'mainnet':
      return 'https://fullnode.mainnet.sui.io:443';
    case 'testnet':
      return 'https://fullnode.testnet.sui.io:443';
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}
