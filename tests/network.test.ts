import { describe, expect, it } from 'vitest';
import { getGrpcFullnodeUrl } from '../src/utils/network';

describe('getGrpcFullnodeUrl', () => {
  it('returns mainnet URL for mainnet', () => {
    expect(getGrpcFullnodeUrl('mainnet')).toBe('https://fullnode.mainnet.sui.io:443');
  });

  it('returns testnet URL for testnet', () => {
    expect(getGrpcFullnodeUrl('testnet')).toBe('https://fullnode.testnet.sui.io:443');
  });

  it('throws for unknown network', () => {
    expect(() => getGrpcFullnodeUrl('devnet' as any)).toThrow('Unknown network: devnet');
  });
});
