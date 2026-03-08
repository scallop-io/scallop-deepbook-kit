import { describe, beforeEach, expect, it, vi } from 'vitest';
import { getOnChainMarginPools } from '../src/queries/getOnChainMarginPools';

function makeDynamicFieldItem(objectId: string) {
  return { objectId };
}

function makeMarginPoolObject(name: string, address: string) {
  return {
    data: {
      content: {
        dataType: 'moveObject',
        fields: {
          value: address,
          name: { fields: { name } },
        },
      },
    },
  };
}

describe('getOnChainMarginPools', () => {
  let suiClientMock: {
    getDynamicFields: ReturnType<typeof vi.fn>;
    multiGetObjects: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    suiClientMock = {
      getDynamicFields: vi.fn(),
      multiGetObjects: vi.fn(),
    };
  });

  it('returns empty record when no dynamic fields exist', async () => {
    suiClientMock.getDynamicFields.mockResolvedValue({
      data: [],
      nextCursor: null,
      hasNextPage: false,
    });
    suiClientMock.multiGetObjects.mockResolvedValue([]);

    const result = await getOnChainMarginPools(suiClientMock as any);
    expect(result).toEqual({});
  });

  it('parses margin pools correctly', async () => {
    const poolAddress = '0xabc123';
    const poolType = '2::sui::SUI';

    suiClientMock.getDynamicFields.mockResolvedValue({
      data: [makeDynamicFieldItem('0xobj1')],
      nextCursor: null,
      hasNextPage: false,
    });

    suiClientMock.multiGetObjects.mockResolvedValue([makeMarginPoolObject(poolType, poolAddress)]);

    const result = await getOnChainMarginPools(suiClientMock as any);

    expect(result).toHaveProperty('SUI');
    expect(result['SUI']).toEqual({
      address: poolAddress,
      type: `0x${poolType}`,
    });
  });

  it('strips underscores from coin name keys', async () => {
    suiClientMock.getDynamicFields.mockResolvedValue({
      data: [makeDynamicFieldItem('0xobj1')],
      nextCursor: null,
      hasNextPage: false,
    });

    suiClientMock.multiGetObjects.mockResolvedValue([
      makeMarginPoolObject('2::deep::DEEP_USD', '0xaddr'),
    ]);

    const result = await getOnChainMarginPools(suiClientMock as any);
    expect(result).toHaveProperty('DEEPUSD');
    expect(result).not.toHaveProperty('DEEP_USD');
  });

  it('paginates through multiple pages of dynamic fields', async () => {
    suiClientMock.getDynamicFields
      .mockResolvedValueOnce({
        data: [makeDynamicFieldItem('0xobj1')],
        nextCursor: 'cursor1',
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        data: [makeDynamicFieldItem('0xobj2')],
        nextCursor: null,
        hasNextPage: false,
      });

    suiClientMock.multiGetObjects.mockResolvedValue([
      makeMarginPoolObject('2::sui::SUI', '0xaddr1'),
      makeMarginPoolObject('2::usdc::USDC', '0xaddr2'),
    ]);

    const result = await getOnChainMarginPools(suiClientMock as any);

    expect(suiClientMock.getDynamicFields).toHaveBeenCalledTimes(2);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result).toHaveProperty('SUI');
    expect(result).toHaveProperty('USDC');
  });

  it('skips objects without moveObject content', async () => {
    suiClientMock.getDynamicFields.mockResolvedValue({
      data: [makeDynamicFieldItem('0xobj1'), makeDynamicFieldItem('0xobj2')],
      nextCursor: null,
      hasNextPage: false,
    });

    suiClientMock.multiGetObjects.mockResolvedValue([
      makeMarginPoolObject('2::sui::SUI', '0xaddr1'),
      { data: { content: { dataType: 'package' } } },
    ]);

    const result = await getOnChainMarginPools(suiClientMock as any);
    expect(Object.keys(result)).toHaveLength(1);
    expect(result).toHaveProperty('SUI');
  });

  it('skips objects with no content', async () => {
    suiClientMock.getDynamicFields.mockResolvedValue({
      data: [makeDynamicFieldItem('0xobj1'), makeDynamicFieldItem('0xobj2')],
      nextCursor: null,
      hasNextPage: false,
    });

    suiClientMock.multiGetObjects.mockResolvedValue([
      makeMarginPoolObject('2::sui::SUI', '0xaddr1'),
      { data: {} },
    ]);

    const result = await getOnChainMarginPools(suiClientMock as any);
    expect(Object.keys(result)).toHaveLength(1);
  });
});
