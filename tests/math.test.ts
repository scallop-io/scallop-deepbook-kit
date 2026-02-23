import { describe, expect, it } from 'vitest';
import { mul, normalize } from '../src/utils/math';
import { FLOAT_SCALAR } from '@mysten/deepbook-v3';

describe('mul', () => {
  it('multiplies two bigints and divides by FLOAT_SCALAR', () => {
    const a = BigInt(FLOAT_SCALAR); // 1.0 in scaled form
    const b = BigInt(FLOAT_SCALAR); // 1.0 in scaled form
    // 1.0 * 1.0 = 1.0
    expect(mul(a, b)).toBe(BigInt(FLOAT_SCALAR));
  });

  it('returns 0 when either operand is 0', () => {
    expect(mul(0n, BigInt(FLOAT_SCALAR))).toBe(0n);
    expect(mul(BigInt(FLOAT_SCALAR), 0n)).toBe(0n);
  });

  it('computes half correctly', () => {
    const half = BigInt(FLOAT_SCALAR) / 2n;
    const one = BigInt(FLOAT_SCALAR);
    // 0.5 * 1.0 = 0.5
    expect(mul(half, one)).toBe(half);
  });
});

describe('normalize', () => {
  it('converts FLOAT_SCALAR to 1.0', () => {
    expect(normalize(BigInt(FLOAT_SCALAR))).toBe(1);
  });

  it('converts 0 to 0', () => {
    expect(normalize(0n)).toBe(0);
  });

  it('converts half FLOAT_SCALAR to 0.5', () => {
    expect(normalize(BigInt(FLOAT_SCALAR) / 2n)).toBe(0.5);
  });

  it('handles arbitrary values', () => {
    // 12% = 0.12
    const twelvePercent = BigInt(Math.floor(0.12 * FLOAT_SCALAR));
    expect(normalize(twelvePercent)).toBeCloseTo(0.12, 5);
  });
});
