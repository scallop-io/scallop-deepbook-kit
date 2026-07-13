import { SuiGrpcClient } from '@mysten/sui/grpc';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { getOnChainMarginPools } from '../queries/getOnChainMarginPools.js';

const main = async () => {
  const network = 'mainnet';
  const client = new SuiGrpcClient({
    baseUrl: getJsonRpcFullnodeUrl(network),
    network: network,
  });

  const pools = await getOnChainMarginPools({ suiClient: client });
  console.log(pools);
};

main()
  .catch(console.error)
  .finally(() => process.exit(0));
