import { DeepBookMarginPool } from '../src/toolkit';

describe('DeepBookMarginToolkit Tests', () => {
  it('Should successfully init the class instance', () => {
    const marginPool = new DeepBookMarginPool();
    expect(marginPool).toBeDefined();
    expect(marginPool.marginPoolContract).toBeDefined();
  });
});
