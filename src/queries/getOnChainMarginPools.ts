import type { MarginPool } from '@mysten/deepbook-v3';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { parseStructTag } from '@mysten/sui/utils';
import { getGrpcFullnodeUrl } from '../utils/network.js';
import { bcs } from '@mysten/sui/bcs';
import { SuiGraphQLClient } from '@mysten/sui/graphql';

const MARGIN_POOLS_TABLE_ID = '0x7f7351ef7e5089dfddf17f55abe028d719c45ca91d2c23e45a441ba65897f804';

declare const _grpcClient: SuiGrpcClient;
type ResponseType<Include extends { value?: boolean } = {}> = Awaited<
  ReturnType<typeof _grpcClient.listDynamicFields<Include>>
>;

/**
 * Fetch all margin pool addresses and their types from the on-chain dynamic fields table.
 * @returns Record<coinKey, { address: string; type: string }>
 */
export const getOnChainMarginPools = async ({
  suiClient = new SuiGrpcClient({
    baseUrl: getGrpcFullnodeUrl('mainnet'),
    network: 'mainnet',
  }),
  tableId = MARGIN_POOLS_TABLE_ID,
}: {
  suiClient?: Pick<SuiGrpcClient | SuiGraphQLClient, 'listDynamicFields' | 'getObjects'>;
  tableId?: string;
} = {}) => {
  const marginPools: Array<{ address: string; type: string }> = [];

  let nextCursor: string | null = null;
  let nextPage = true;

  do {
    const resp: ResponseType<{ value: true }> = await suiClient.listDynamicFields({
      parentId: tableId,
      cursor: nextCursor,
      limit: 50,
      include: {
        value: true,
      },
    });
    const { dynamicFields, cursor, hasNextPage } = resp;

    marginPools.push(
      ...dynamicFields.map((item) => ({
        type: `0x${bcs.string().parse(item.name.bcs)}`,
        address: bcs.Address.parse(item.value.bcs),
      }))
    );

    if (dynamicFields.length === 0) {
      break;
    }

    nextCursor = cursor;
    nextPage = hasNextPage;
  } while (nextPage);

  return marginPools.reduce(
    (acc, pool) => {
      const { name } = parseStructTag(pool.type);
      acc[name.replace(/_/g, '')] = pool;
      return acc;
    },
    {} as Record<string, MarginPool>
  );
};
