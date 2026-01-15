import { DeepBookMarginPool } from './toolkit';

const main = async () => {
  try {
    const marginPool = new DeepBookMarginPool();
    const suiParams = await marginPool.getPoolParameters('SUI');

    console.log({ suiParams });
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
};

main();
