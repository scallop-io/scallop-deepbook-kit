import { DeepBookConfig } from '@mysten/deepbook-v3';
import { DeepBookMarginPool } from '../toolkit/index.js';

const MARGIN_POOLS = {
  SUI: {
    address: '0x53041c6f86c4782aabbfc1d4fe234a6d37160310c7ee740c915f0a01b7127344',
    type: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  },
  USDC: {
    address: '0xba473d9ae278f10af75c50a8fa341e9c6a1c087dc91a3f23e8048baf67d0754f',
    type: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  },
  DEEP: {
    address: '0x1d723c5cd113296868b55208f2ab5a905184950dd59c48eb7345607d6b5e6af7',
    type: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP',
  },
  WAL: {
    address: '0x38decd3dbb62bd4723144349bf57bc403b393aee86a51596846a824a1e0c2c01',
    type: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',
  },
};

const main = async () => {
  try {
    const network = 'mainnet';
    const dbMarginPool = new DeepBookMarginPool({
      network,
      dbConfig: new DeepBookConfig({
        network,
        address: '',
        marginPools: MARGIN_POOLS,
      }),
    });
    const coinKey = 'USDC';
    const suiMarginPoolParams = await dbMarginPool.getPoolParameters(coinKey);
    console.log(`${coinKey} Margin Pool Parameters:`, suiMarginPoolParams);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    process.exit(0);
  }
};

main();
