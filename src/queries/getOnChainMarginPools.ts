import { MarginPool } from '@mysten/deepbook-v3';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { parseStructTag } from '@mysten/sui/utils';

const MARGIN_POOLS_TABLE_ID = '0x7f7351ef7e5089dfddf17f55abe028d719c45ca91d2c23e45a441ba65897f804';

/**
 * Fetch all margin pool addresses and their types from the on-chain dynamic fields table.
 * @returns Record<coinKey, { address: string; type: string }>
 */
export const getOnChainMarginPools = async (
  suiClient: SuiClient = new SuiClient({
    url: getFullnodeUrl('mainnet'),
  })
) => {
  const marginPools: Array<{ address: string; type: string }> = [];
  const ids: string[] = [];

  let cursor: string | null = null;
  let nextPage = true;

  while (nextPage) {
    const { data, nextCursor, hasNextPage } = await suiClient.getDynamicFields({
      parentId: MARGIN_POOLS_TABLE_ID,
      cursor,
      limit: 50,
    });

    ids.push(...data.map((item) => item.objectId));

    if (data.length === 0) {
      break;
    }

    cursor = nextCursor;
    nextPage = hasNextPage;
  }

  // Fetch all the object ids
  const objects = await suiClient.multiGetObjects({ ids, options: { showContent: true } });

  for (const obj of objects) {
    const content = obj.data?.content;
    if (!content || content.dataType !== 'moveObject') continue;
    const fields = content.fields as Record<string, any>;
    marginPools.push({
      address: fields.value,
      type: `0x${fields.name?.fields?.name}`,
    });
  }

  return marginPools.reduce(
    (acc, pool) => {
      // Get symbol from type
      const { name } = parseStructTag(pool.type);
      acc[name.replace(/_/g, '')] = pool;
      return acc;
    },
    {} as Record<string, MarginPool>
  );
};
