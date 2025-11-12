import { formatAmount } from '../src/utils';

describe('Utils', () => {
  describe('formatAmount', () => {
    it('should format amount correctly', () => {
      const amount = BigInt('1000000000'); // 1.0 with 9 decimals
      const result = formatAmount(amount, 9);
      expect(result).toBe('1.000000000');
    });
  });
});
