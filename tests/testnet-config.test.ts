/**
 * Tests for testnet configuration | 測試網配置測試
 */

import { TESTNET_COINS, TESTNET_MARGIN_POOLS } from '../src/testnet-config';
import { formatCoinAmount, getCoinConfig, getPoolConfig, parseCoinAmount } from '../src/config';

describe('Testnet Configuration | 測試網配置', () => {
  describe('TESTNET_COINS', () => {
    it('should have correct SUI configuration | 應有正確的 SUI 配置', () => {
      expect(TESTNET_COINS.SUI).toBeDefined();
      expect(TESTNET_COINS.SUI.decimals).toBe(9);
      expect(TESTNET_COINS.SUI.scalar).toBe(1_000_000_000);
    });

    it('should have correct DBUSDC configuration | 應有正確的 DBUSDC 配置', () => {
      expect(TESTNET_COINS.DBUSDC).toBeDefined();
      expect(TESTNET_COINS.DBUSDC.decimals).toBe(6);
      expect(TESTNET_COINS.DBUSDC.scalar).toBe(1_000_000);
    });
  });

  describe('formatCoinAmount | 格式化代幣數量', () => {
    it('should format SUI amount correctly | 應正確格式化 SUI 數量', () => {
      const amount = 1_000_000_000; // 1 SUI
      const formatted = formatCoinAmount(amount, 'SUI');
      expect(formatted).toBe('1.000000000');
    });

    it('should format DBUSDC amount correctly | 應正確格式化 DBUSDC 數量', () => {
      const amount = 1_000_000; // 1 DBUSDC
      const formatted = formatCoinAmount(amount, 'DBUSDC');
      expect(formatted).toBe('1.000000');
    });

    it('should format decimal amounts correctly | 應正確格式化小數數量', () => {
      const amount = 123_456_789; // 0.123456789 SUI
      const formatted = formatCoinAmount(amount, 'SUI');
      expect(formatted).toBe('0.123456789');
    });
  });

  describe('parseCoinAmount | 解析代幣數量', () => {
    it('should parse SUI amount correctly | 應正確解析 SUI 數量', () => {
      const amount = 1.5;
      const parsed = parseCoinAmount(amount, 'SUI');
      expect(parsed).toBe(1_500_000_000);
    });

    it('should parse DBUSDC amount correctly | 應正確解析 DBUSDC 數量', () => {
      const amount = 10.5;
      const parsed = parseCoinAmount(amount, 'DBUSDC');
      expect(parsed).toBe(10_500_000);
    });

    it('should handle small amounts correctly | 應正確處理小額數量', () => {
      const amount = 0.1;
      const parsed = parseCoinAmount(amount, 'SUI');
      expect(parsed).toBe(100_000_000);
    });
  });

  describe('getPoolConfig | 獲取池子配置', () => {
    it('should return correct pool configuration | 應返回正確的池子配置', () => {
      const config = getPoolConfig('SUI_DBUSDC');
      expect(config).toBeDefined();
      expect(config!.baseCoin).toBe('SUI');
      expect(config!.quoteCoin).toBe('DBUSDC');
    });
  });

  describe('getCoinConfig | 獲取代幣配置', () => {
    it('should return correct coin configuration | 應返回正確的代幣配置', () => {
      const config = getCoinConfig('SUI');
      expect(config).toBeDefined();
      expect(config!.decimals).toBe(9);
      expect(config!.scalar).toBe(1_000_000_000);
    });
  });

  describe('TESTNET_MARGIN_POOLS', () => {
    it('should have SUI margin pool | 應有 SUI margin pool', () => {
      expect(TESTNET_MARGIN_POOLS.SUI).toBeDefined();
      expect(TESTNET_MARGIN_POOLS.SUI.address).toBeTruthy();
      expect(TESTNET_MARGIN_POOLS.SUI.type).toContain('SUI');
    });

    it('should have DBUSDC margin pool | 應有 DBUSDC margin pool', () => {
      expect(TESTNET_MARGIN_POOLS.DBUSDC).toBeDefined();
      expect(TESTNET_MARGIN_POOLS.DBUSDC.address).toBeTruthy();
      expect(TESTNET_MARGIN_POOLS.DBUSDC.type).toContain('DBUSDC');
    });
  });
});
