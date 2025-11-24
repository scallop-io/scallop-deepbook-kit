import { FLOAT_SCALAR } from '@mysten/deepbook-v3';

export const mul = (a: bigint, b: bigint): bigint => (a * b) / BigInt(FLOAT_SCALAR);
export const normalize = (value: bigint): number => Number(value) / FLOAT_SCALAR; // e.g. 0.12 = 12%
