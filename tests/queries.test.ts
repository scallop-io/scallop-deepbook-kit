import { describe, beforeEach, expect, it, vi } from 'vitest';
import { getOnChainMarginPools } from '../src/queries/getOnChainMarginPools';

function makeDynamicFieldItem(fieldId: string) {
  return { fieldId };
}

function makeMarginPoolObject(name: string, address: string) {
  return {
    json: {
      value: address,
      name: { name },
    },
  };
}

describe('getOnChainMarginPools', () => {
  let suiClientMock: {
    listDynamicFields: ReturnType<typeof vi.fn>;
    getObjects: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    suiClientMock = {
      listDynamicFields: vi.fn(),
      getObjects: vi.fn(),
    };
  });

  it('returns empty record when no dynamic fields exist', async () => {
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [],
      cursor: null,
      hasNextPage: false,
    });
    suiClientMock.getObjects.mockResolvedValue({ objects: [] });

    const result = await getOnChainMarginPools({ suiClient: suiClientMock as any });
    expect(result).toEqual({});
  });

  it('parses margin pools correctly', async () => {
    const poolAddress = '0xabc123';
    const poolType = '2::sui::SUI';

    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [makeDynamicFieldItem('0xobj1')],
      cursor: null,
      hasNextPage: false,
    });
    suiClientMock.getObjects.mockResolvedValue({
      objects: [makeMarginPoolObject(poolType, poolAddress)],
    });

    const result = await getOnChainMarginPools({ suiClient: suiClientMock as any });

    expect(result).toHaveProperty('SUI');
    expect(result.SUI).toEqual({
      address: poolAddress,
      type: `0x${poolType}`,
    });
  });

  it('strips underscores from coin name keys', async () => {
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [makeDynamicFieldItem('0xobj1')],
      cursor: null,
      hasNextPage: false,
    });
    suiClientMock.getObjects.mockResolvedValue({
      objects: [makeMarginPoolObject('2::deep::DEEP_USD', '0xaddr')],
    });

    const result = await getOnChainMarginPools({ suiClient: suiClientMock as any });
    expect(result).toHaveProperty('DEEPUSD');
    expect(result).not.toHaveProperty('DEEP_USD');
  });

  it('paginates through multiple pages of dynamic fields', async () => {
    suiClientMock.listDynamicFields
      .mockResolvedValueOnce({
        dynamicFields: [makeDynamicFieldItem('0xobj1')],
        cursor: 'cursor1',
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        dynamicFields: [makeDynamicFieldItem('0xobj2')],
        cursor: null,
        hasNextPage: false,
      });
    suiClientMock.getObjects.mockResolvedValue({
      objects: [
        makeMarginPoolObject('2::sui::SUI', '0xaddr1'),
        makeMarginPoolObject('2::usdc::USDC', '0xaddr2'),
      ],
    });

    const result = await getOnChainMarginPools({ suiClient: suiClientMock as any });

    expect(suiClientMock.listDynamicFields).toHaveBeenCalledTimes(2);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result).toHaveProperty('SUI');
    expect(result).toHaveProperty('USDC');
  });

  it('skips objects with missing json fields', async () => {
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [makeDynamicFieldItem('0xobj1'), makeDynamicFieldItem('0xobj2')],
      cursor: null,
      hasNextPage: false,
    });
    suiClientMock.getObjects.mockResolvedValue({
      objects: [makeMarginPoolObject('2::sui::SUI', '0xaddr1'), { json: {} }],
    });

    const result = await getOnChainMarginPools({ suiClient: suiClientMock as any });
    expect(Object.keys(result)).toHaveLength(1);
    expect(result).toHaveProperty('SUI');
  });

  it('skips object fetch errors', async () => {
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [makeDynamicFieldItem('0xobj1'), makeDynamicFieldItem('0xobj2')],
      cursor: null,
      hasNextPage: false,
    });
    suiClientMock.getObjects.mockResolvedValue({
      objects: [makeMarginPoolObject('2::sui::SUI', '0xaddr1'), new Error('not found')],
    });

    const result = await getOnChainMarginPools({ suiClient: suiClientMock as any });
    expect(Object.keys(result)).toHaveLength(1);
  });

  it('uses custom tableId when provided', async () => {
    const customTableId = '0xcustom';
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [],
      cursor: null,
      hasNextPage: false,
    });
    suiClientMock.getObjects.mockResolvedValue({ objects: [] });

    await getOnChainMarginPools({ suiClient: suiClientMock as any, tableId: customTableId });

    expect(suiClientMock.listDynamicFields).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: customTableId })
    );
  });

  it('batches getObjects calls in groups of 50', async () => {
    const fieldIds = Array.from({ length: 75 }, (_, idx) => makeDynamicFieldItem(`0xobj${idx}`));
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: fieldIds,
      cursor: null,
      hasNextPage: false,
    });
    suiClientMock.getObjects
      .mockResolvedValueOnce({
        objects: Array.from({ length: 50 }, (_, idx) =>
          makeMarginPoolObject(`2::coin::COIN_${idx}`, `0xaddr${idx}`)
        ),
      })
      .mockResolvedValueOnce({
        objects: Array.from({ length: 25 }, (_, idx) =>
          makeMarginPoolObject(`2::coin::TAIL_${idx}`, `0xtail${idx}`)
        ),
      });

    await getOnChainMarginPools({ suiClient: suiClientMock as any });

    expect(suiClientMock.getObjects).toHaveBeenCalledTimes(2);
    expect(suiClientMock.getObjects.mock.calls[0]?.[0]?.objectIds).toHaveLength(50);
    expect(suiClientMock.getObjects.mock.calls[1]?.[0]?.objectIds).toHaveLength(25);
  });
});
