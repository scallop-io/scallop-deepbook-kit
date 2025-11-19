import { DeepBookMarginToolkit } from '../src/toolkit';
import { config } from 'dotenv';
config();

describe('DeepBookMarginToolkit Tests', () => {
  it('Should successfully init the class instance', () => {
    const toolkit = new DeepBookMarginToolkit({
      privateKey: process.env.PRIVATE_KEY as string,
      network: 'testnet',
    });
    expect(toolkit).toBeDefined();
    expect(toolkit.getAddress().length > 0).toBe(true);
  });
});
