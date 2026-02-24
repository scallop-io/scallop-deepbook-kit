import { describe, expect, it } from 'vitest';
import {
  isHex,
  isBase64,
  hexOrBase64ToUint8Array,
  normalizePrivateKey,
} from '../src/utils/private-key';

describe('isHex', () => {
  it('returns true for valid hex without prefix', () => {
    expect(isHex('aabbcc')).toBe(true);
    expect(isHex('0123456789abcdefABCDEF')).toBe(true);
  });

  it('returns true for valid hex with 0x prefix', () => {
    expect(isHex('0xaabbcc')).toBe(true);
  });

  it('returns false for non-hex strings', () => {
    expect(isHex('xyz')).toBe(false);
    expect(isHex('')).toBe(false);
    expect(isHex('0x')).toBe(false);
  });
});

describe('isBase64', () => {
  it('returns true for valid base64 strings', () => {
    expect(isBase64('YWJj')).toBe(true);
    expect(isBase64('dGVzdA==')).toBe(true);
    expect(isBase64('aGVsbG8=')).toBe(true);
  });

  it('returns false for non-base64 strings', () => {
    expect(isBase64('')).toBe(false);
    expect(isBase64('hello world')).toBe(false);
    expect(isBase64('abc!@#')).toBe(false);
  });
});

describe('hexOrBase64ToUint8Array', () => {
  it('converts hex string to Uint8Array', () => {
    const result = hexOrBase64ToUint8Array('aabb');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result).toEqual(new Uint8Array([0xaa, 0xbb]));
  });

  it('converts hex string with 0x prefix to Uint8Array', () => {
    const result = hexOrBase64ToUint8Array('0xaabb');
    expect(result).toEqual(new Uint8Array([0xaa, 0xbb]));
  });

  it('converts base64 string to Uint8Array', () => {
    // "dGVzdA==" is base64 for "test"
    const result = hexOrBase64ToUint8Array('dGVzdA==');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(result).toString('utf-8')).toBe('test');
  });

  it('throws for invalid strings', () => {
    expect(() => hexOrBase64ToUint8Array('not valid!!!')).toThrow(
      'The string is not a valid hex or base64 string.'
    );
  });
});

describe('normalizePrivateKey', () => {
  it('returns 32-byte key as-is', () => {
    const key = new Uint8Array(32).fill(1);
    expect(normalizePrivateKey(key)).toEqual(key);
  });

  it('slices 64-byte legacy key to first 32 bytes', () => {
    const key = new Uint8Array(64);
    key.fill(1, 0, 32);
    key.fill(2, 32, 64);
    const result = normalizePrivateKey(key);
    expect(result.length).toBe(32);
    expect(result).toEqual(new Uint8Array(32).fill(1));
  });

  it('strips leading 0x00 from 33-byte sui.keystore key', () => {
    const key = new Uint8Array(33);
    key[0] = 0;
    key.fill(1, 1, 33);
    const result = normalizePrivateKey(key);
    expect(result.length).toBe(32);
    expect(result).toEqual(new Uint8Array(32).fill(1));
  });

  it('throws for invalid key lengths', () => {
    expect(() => normalizePrivateKey(new Uint8Array(16))).toThrow('invalid secret key');
    expect(() => normalizePrivateKey(new Uint8Array(48))).toThrow('invalid secret key');
  });

  it('throws for 33-byte key without leading 0x00', () => {
    const key = new Uint8Array(33).fill(1);
    expect(() => normalizePrivateKey(key)).toThrow('invalid secret key');
  });
});
