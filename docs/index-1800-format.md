# Index.1800 File Format (Complete Reverse Engineering)

Source: Decompiled from tally.exe memory dump + analysis of live company data.

## What Index.1800 Actually Is

It's a **search optimization index** — NOT a page-level B-tree. It stores:
- Voucher numbers (for fast lookup by number)
- Voucher references/invoice numbers
- Addresses/pincodes (for GST lookups)
- Stock item codes
- Object type registry (maps type IDs to starting pages in Manager.1800)

**Tally rebuilds it from scratch on startup if missing.** Deleting it is safe.
**For master creation (ledgers, groups), it does NOT need updating** — it only
indexes voucher/transaction data.

## File Layout

```
Page 0:        File header (512 bytes)
Pages 1-7:    Reserved (zeros)
Pages 8-15:   Group 1 (1 directory page + 7 data pages)
Pages 16-23:  Group 2
Pages 24-31:  Group 3
...
Pages N*8 to N*8+7: Group N
```

Each group = 8 pages = 4096 bytes.

## File Header (Page 0)

```
Offset  Size  Value/Description
------  ----  -----------------
0x00    4     Checksum (dual CRC-16/CCITT, same as data files)
0x04    4     Version (1)
0x08    4     Reserved (0)
0x0C    11    ASCII "Tally Index\0" (magic signature)
0x18    1     Flags
0x19    1     Sub-version (1)
0x1A    2     Entry type descriptor
0x20    4     Total entries / max sequence
0x24    4     Reserved
0x28    4     Last used group count
0x2C    4     Total data entries
0x30    4     Last used group count (copy)
0x3C    2     Page size: 0x0200 (512)
0x42    2     Page size: 0x0200 (512) (duplicate)
```

## Directory Page (first page of each 8-page group)

```
Offset  Size  Description
------  ----  -----------
0x00    4     Checksum
0x04    2     Group sequence number (uint16, increments)
0x06    2     Type: 0x0003=active data, 0x0005=metadata/structure
0x08    4     Base data offset for this group
0x0C    2     First entry offset (uint16)
0x0E    2     Entry count or last offset (uint16)
0x10    2*N   Array of uint16 offsets pointing into data pages
```

The uint16 offsets in the directory page point to record positions within
the group's 7 data pages (3584 bytes total). Offsets decrease (records
are filled from the end of the data area backwards).

## Record Format (in data pages)

Each record has a variable-length header followed by type-specific data.

### Record Header (6-14 bytes)

```
Offset  Size  Description
------  ----  -----------
0x00    2     Flags (uint16, bit field)
0x02    4     Sequence ID / Object ID
--- Optional (based on flags) ---
0x06    4     [bit 10] Parent/Group reference
0x0A    4     [bit 11] Extended reference
var     2/4   [bit 12] Count (2 bytes if bit13=0, 4 bytes if bit13=1)
```

Flag bits in the header uint16:
- Bit 0: Sign/direction flag
- Bits 2-4: BST node pointer count (0=leaf, shifted from node type)
- Bit 5-6: Additional field flags
- Bit 7: Negative amount flag
- Bit 8: Extended data present
- Bit 9: Page size indicator
- Bit 10: Has parent reference (adds 4 bytes)
- Bit 11: Has extended reference (adds 4 bytes)
- Bit 12: Has count field
- Bit 13: Count is 4 bytes (else 2 bytes)
- Bit 14: Extended record format

### Record Data (after header)

The data portion depends on the object type (from bits 8-12 of the
field descriptor at node+0x10, shifted right by 24):

| Type | Size | Description |
|------|------|-------------|
| 2-6, 0xd, 0x15 | 4 bytes | Single uint32 (ID, count, flag) |
| 7-8, 0x17 | 8 bytes | uint64 (large ID, timestamp) |
| 9 | 8-40 bytes | Amount (int64 + optional rate data) |
| 0xa | 20 bytes | Date (int64 date + int64 time + int32 flags) |
| 0xb | 12-24 bytes | Rate/ratio (int64 + int32 + optional extended) |
| 0xc | 20-52 bytes | Complex (amount + optional breakdown) |
| 0xe | 50 bytes | Address/multi-field record |
| 0xf | variable | Raw TLV data (same encoding as Manager.1800) |
| 0x11, 0x18, 0x19 | variable | Raw memcpy (size from descriptor) |
| 0x16 | 8 bytes | Two uint32s |

### BST Node Pointers (after record header, before data)

When the node has children in the BST, pointers are stored between
the header and data. Size determined by `flags & 7`:

| flags & 7 | Pointer bytes | Meaning |
|-----------|---------------|---------|
| 0 | 0 | Leaf node (no children) |
| 2 | 4 | One child pointer (uint32 seq) |
| 4 | 16 | Two pointers (left + right, as uint32 seq each + 8 bytes extra) |
| 6 | 24 | Three pointers (left + right + parent) |

**Byte swizzle on write** (FUN_7ff781664870):
```
disk[0] = memory[2]   // field reordering for alignment
disk[1] = memory[0]
disk[2] = memory[1]
disk[3] = memory[3]
```

**Byte swizzle on read** (FUN_7ff781664850):
```
memory[2] = disk[0]
memory[0] = disk[1]
memory[1] = disk[2]
memory[3] = disk[3]
```

## Key Functions (from tally.exe dump)

| Address | Name | Purpose |
|---------|------|---------|
| 7ff782101230 | IndexHeaderInit | Writes "Tally Index" + page size to header |
| 7ff78162ec80 | SerializeNode | Writes one BST node to disk buffer |
| 7ff78162e6f0 | DeserializeNode | Reads one BST node from disk buffer |
| 7ff78162f770 | GetOutputPos | Calculates write position, writes record header |
| 7ff781664870 | SwizzleWrite | Reorders uint32 fields for disk layout |
| 7ff781664850 | SwizzleRead | Reverses field reordering on read |
| 7ff781664a80 | CalcRecordSize | Computes variable record size from flags |
| 7ff781623b60 | FlushIndex | Writes dirty BST pages to Index.1800 |
| 7ff78164c980 | BSTInsert | In-memory BST insert |
| 7ff78164c010 | BSTDelete | In-memory BST delete |
| 7ff78164c7b0 | SetupComparators | Sets comparison functions per field type |

## Practical Notes

1. The Index.1800 is rebuilt by Tally on startup if missing — deleting it is safe.
2. Records are written from the END of data pages backwards (offsets decrease).
3. The directory page's uint16 array provides direct access to any record.
4. The BST is ordered by sequence number — new entries go at the end.
5. For simple writes (append-only), you can:
   - Append a new group (8 pages)
   - Write the new record in the data pages
   - Add the offset to the directory page
   - Update the file header counts
