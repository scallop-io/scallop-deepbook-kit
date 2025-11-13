import { DeepBookMarginPool } from '../toolkit';

const main = async () => {
  try {
    const dbMarginPool = new DeepBookMarginPool();
    const suiMarginPoolParams = await dbMarginPool.getPoolParameters('SUI');
    console.log('SUI Margin Pool Parameters:', suiMarginPoolParams);
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    process.exit(0);
  }
};

main();
