import { DeepBookMarginPool } from './toolkit/DeepBookMarginPool';
import { config } from 'dotenv';
config();

const main = async () => {
  try {
    const dbMarginPool = new DeepBookMarginPool();
    console.log(await dbMarginPool.getPoolParameters('SUI'));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
};

main();
