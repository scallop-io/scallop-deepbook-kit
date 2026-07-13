import { describe, beforeEach, expect, it, vi } from 'vitest';
import { bcs } from '@mysten/sui/bcs';
import { getOnChainMarginPools } from '../src/queries/getOnChainMarginPools';

// Mirrors a `listDynamicFields({ include: { value: true } })` entry: the coin
// type is the field *name* (BCS-encoded string), the pool address is the field
// *value* (BCS-encoded address). Encoding with the real bcs codec means these
// tests actually exercise the decode logic, not a hand-mocked shape.
function makeField(typeStr: string, address: string) {
  return {
    fieldId: '0xfield',
    $kind: 'DynamicField' as const,
    name: { type: '0x1::type_name::TypeName', bcs: bcs.string().serialize(typeStr).toBytes() },
    value: { type: 'address', bcs: bcs.Address.serialize(address).toBytes() },
  };
}

// Addresses come back through bcs.Address (normalized to 0x + 64 hex).
const normAddr = (a: string) => bcs.Address.parse(bcs.Address.serialize(a).toBytes());

describe('getOnChainMarginPools', () => {
  let suiClientMock: {
    listDynamicFields: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    suiClientMock = {
      listDynamicFields: vi.fn(),
    };
  });

  it('returns empty record when no dynamic fields exist', async () => {
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [],
      cursor: null,
      hasNextPage: false,
    });

    const result = await getOnChainMarginPools({ suiClient: suiClientMock as any });
    expect(result).toEqual({});
  });

  it('decodes the coin type and pool address from the field name/value BCS', async () => {
    const poolType = '2::sui::SUI';
    const poolAddress = '0xabc123';

    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [makeField(poolType, poolAddress)],
      cursor: null,
      hasNextPage: false,
    });

    const result = await getOnChainMarginPools({ suiClient: suiClientMock as any });

    expect(result).toHaveProperty('SUI');
    expect(result.SUI).toEqual({
      type: `0x${poolType}`,
      address: normAddr(poolAddress),
    });
  });

  // Would fail if name.bcs and value.bcs were read in the wrong order (a real
  // risk given both are Uint8Array): the address bytes are not a valid utf-8
  // string and the type bytes are not a valid 32-byte address.
  it('does not confuse the type field with the address field', async () => {
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [makeField('2::usdc::USDC', '0xdead')],
      cursor: null,
      hasNextPage: false,
    });

    const result = await getOnChainMarginPools({ suiClient: suiClientMock as any });

    expect(result.USDC?.type).toBe('0x2::usdc::USDC');
    expect(result.USDC?.address).toBe(normAddr('0xdead'));
  });

  it('strips underscores from coin name keys', async () => {
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [makeField('2::deep::DEEP_USD', '0xbeef')],
      cursor: null,
      hasNextPage: false,
    });

    const result = await getOnChainMarginPools({ suiClient: suiClientMock as any });
    expect(result).toHaveProperty('DEEPUSD');
    expect(result).not.toHaveProperty('DEEP_USD');
  });

  // Regression guard for the previous bug: values must be fetched inline via
  // `include: { value: true }`. Without it, `item.value` is undefined and
  // decoding throws — the old mock-based tests never asserted this.
  it('requests dynamic field values inline (include.value)', async () => {
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [makeField('2::sui::SUI', '0xbeef')],
      cursor: null,
      hasNextPage: false,
    });

    await getOnChainMarginPools({ suiClient: suiClientMock as any });

    expect(suiClientMock.listDynamicFields).toHaveBeenCalledWith(
      expect.objectContaining({ include: { value: true } })
    );
  });

  it('paginates by threading the cursor forward across pages', async () => {
    suiClientMock.listDynamicFields
      .mockResolvedValueOnce({
        dynamicFields: [makeField('2::sui::SUI', '0xbeef1')],
        cursor: 'cursor1',
        hasNextPage: true,
      })
      .mockResolvedValueOnce({
        dynamicFields: [makeField('2::usdc::USDC', '0xbeef2')],
        cursor: null,
        hasNextPage: false,
      });

    const result = await getOnChainMarginPools({ suiClient: suiClientMock as any });

    expect(suiClientMock.listDynamicFields).toHaveBeenCalledTimes(2);
    // First page starts with a null cursor...
    expect(suiClientMock.listDynamicFields.mock.calls[0]?.[0]).toMatchObject({ cursor: null });
    // ...and the second page must reuse the cursor returned by the first.
    expect(suiClientMock.listDynamicFields.mock.calls[1]?.[0]).toMatchObject({ cursor: 'cursor1' });
    expect(Object.keys(result)).toHaveLength(2);
    expect(result).toHaveProperty('SUI');
    expect(result).toHaveProperty('USDC');
  });

  it('stops paginating once hasNextPage is false', async () => {
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [makeField('2::sui::SUI', '0xbeef')],
      cursor: 'somecursor',
      hasNextPage: false,
    });

    await getOnChainMarginPools({ suiClient: suiClientMock as any });

    expect(suiClientMock.listDynamicFields).toHaveBeenCalledTimes(1);
  });

  it('uses custom tableId when provided', async () => {
    const customTableId = '0xcustom';
    suiClientMock.listDynamicFields.mockResolvedValue({
      dynamicFields: [],
      cursor: null,
      hasNextPage: false,
    });

    await getOnChainMarginPools({ suiClient: suiClientMock as any, tableId: customTableId });

    expect(suiClientMock.listDynamicFields).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: customTableId })
    );
  });
});
