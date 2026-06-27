import type { MarginPool } from '@mysten/deepbook-v3';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { parseStructTag } from '@mysten/sui/utils';
import { getGrpcFullnodeUrl } from '../utils/network.js';

const MARGIN_POOLS_TABLE_ID = '0x7f7351ef7e5089dfddf17f55abe028d719c45ca91d2c23e45a441ba65897f804';
const OBJECT_BATCH_SIZE = 50;

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
  suiClient?: Pick<SuiGrpcClient, 'listDynamicFields' | 'getObjects'>;
  tableId?: string;
} = {}) => {
  const marginPools: Array<{ address: string; type: string }> = [];
  const ids: string[] = [];

  let cursor: string | null = null;
  let nextPage = true;

  while (nextPage) {
    const {
      dynamicFields,
      // @ts-ignore
      cursor: nextCursor,
      hasNextPage,
    } = await suiClient.listDynamicFields({
      parentId: tableId,
      cursor,
      limit: 50,
    });

    ids.push(...dynamicFields.map((item) => item.fieldId));

    if (dynamicFields.length === 0) {
      break;
    }

    cursor = nextCursor;
    nextPage = hasNextPage;
  }

  for (let i = 0; i < ids.length; i += OBJECT_BATCH_SIZE) {
    const objectIds = ids.slice(i, i + OBJECT_BATCH_SIZE);
    const { objects } = await suiClient.getObjects({
      objectIds,
      include: { json: true },
    });

    for (const obj of objects) {
      if (obj instanceof Error) continue;

      const json = obj.json as
        | {
            value?: string;
            name?: {
              name?: string;
            };
          }
        | undefined;

      if (!json?.value || !json.name?.name) continue;

      marginPools.push({
        address: json.value,
        type: `0x${json.name.name}`,
      });
    }
  }

  return marginPools.reduce(
    (acc, pool) => {
      const { name } = parseStructTag(pool.type);
      acc[name.replace(/_/g, '')] = pool;
      return acc;
    },
    {} as Record<string, MarginPool>
  );
};
