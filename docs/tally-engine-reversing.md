# Tally Write Engine - Reverse Engineering Summary

## Source
- Dumped from `tally.exe` process memory using `pe-sieve` (VMProtect decrypted at runtime)
- 48.9MB PE with 16MB of native x86-64 code (95,529 functions)
- Decompiled using Ghidra 12.1 headless analyzer

## Key Findings

### 1. Page Format (CONFIRMED)
- **Page size: 512 bytes** (0x200) — hardcoded, but can be read from file header
- **Page ID format: [3-bit file_index][29-bit page_number]**
  - Top 3 bits = which file (Manager=0, TranMgr=1, LinkMgr=2, etc.)
  - Bottom 29 bits = page number within that file
  - Encoding: `file_index * 0x20000000 | page_number`
  - Decoding: `file_index = page_id >> 29`, `page_number = page_id & 0x1FFFFFFF`
- **File offset = page_number << 9** (page_number * 512)
- **Max file size: 0x40000000 pages** (1GB limit per file)

### 2. In-Memory Index Structure (BST, NOT B-tree!)
Tally uses a **simple Binary Search Tree** for its in-memory page index:

```
Node structure (0x78 bytes allocated, data at +0x34):
  +0x1C: page_id (uint32, the key)
  +0x20: left_child (uint32, page_id of left child, 0 = none)
  +0x24: right_child (uint32, page_id of right child, 0 = none)
  +0x28: prev (uint32, previous node in sorted order - linked list)
  +0x2C: next (uint32, next node in sorted order - linked list)
  +0x30: dirty_flag (uint32, 1 = modified, needs flush to disk)

Tree header (3 uint32s):
  [0]: root page_id
  [1]: min page_id (leftmost/first in sorted order)
  [2]: max page_id (rightmost/last in sorted order)
```

### 3. BST Insert Algorithm (FUN_7ff78164c980)
```
1. Set dirty_flag = 1, left = right = 0
2. If tree empty: root = min = max = new_page_id; return
3. Walk tree: if new < current, go left; else go right
4. At leaf: insert as child of leaf
5. Update linked list (prev/next pointers):
   - If inserted left of parent: new.prev = parent.prev, new.next = parent
   - If inserted right of parent: new.prev = parent, new.next = parent.next
6. Update min/max if needed
7. Mark parent dirty
```

### 4. BST Delete Algorithm (FUN_7ff78164c010)
Standard BST delete with in-order successor replacement:
1. Find node to delete
2. If two children: find in-order successor (go right, then keep going left)
3. Replace deleted node with successor
4. Update parent pointers and linked list
5. Mark modified nodes dirty

### 5. Object Write Pipeline (FUN_7ff781616f30)
Three operations via `param_4`:
- **param_4 == 1**: CREATE — allocate new pages, serialize object, insert into BST index
- **param_4 == 2**: UPDATE — modify existing pages
- **param_4 == 3**: DELETE — free pages, remove from BST index

Create flow:
1. Open file if not already open (`FUN_7ff781618b10`)
2. Serialize object to pages (`vtable call +0xa8`)
3. Validate write (`FUN_7ff781649f50`)
4. Remove old entry from cache (`FUN_7ff78159cbc0`)
5. Write pages to disk (`FUN_7ff781617390`)
6. Insert into BST index (`FUN_7ff781616620`)
7. Update size counters (subtract `count * 0x200` for freed pages)

### 6. Page Allocator (FUN_7ff781618550)
```
Database object structure:
  +0x30: page buffer (512 bytes)
  +0x48: parent/context pointer
  +0x58: page table/header pointer
  +0x58+8: total page count (incremented on alloc)
  +0xD8: array of BST trees (one per record type)
  +0xE0: number of record types (files)
  +0xE4: page size (usually 512)
  +0xEC: multi-file flag
  +0x1A0: overflow/extra pages BST
  +0x200: total size in bytes
  +0x208: free page list BST
  +0x244: last allocated page number
  +0x248: allocation in progress flag
```

### 7. File I/O Stats Object (at +0x18)
```
  +0x00: Number of rec read from disk
  +0x04: Number of rec from ID
  +0x08: Number of rec from offset
  +0x10: Number of file offset reads
  +0x18: Total file read time (ticks)
  +0x30: Total file write time (ticks)
  +0x38: Number of TallyServer file offset reads
  +0x3C: Total Server File Network Reads
  +0x40: Cache hit data
  +0x48: Number of nodes with CRC errors
  +0x58: Number of uncached reads
  +0x60: Number of Server file offset writes
  +0x64: Number of Server file network writes
  +0x70: Size in bytes of cached primary recs
  +0x74: Size in bytes of subrecs in mem
  +0x78: Peak size of cached primary recs
  +0x7C: Peak size of subrecs in mem
```

### 8. File Format Versions
The setup function handles 5 format versions:
- Version 1: Direct local file (simplest)
- Version 2-5: Different read/write handler pairs

### 9. Database File Open (FUN_7ff78161f1d0)
- Checks for remote protocols (FTP, HTTP, HTTPS, MAILTO)
- Reads page size from file (default 0x200 = 512)
- Allocates 512-byte page buffer
- Creates I/O stats object
- Record type entries are 0x820 (2080) bytes each in the header

## What This Means for Your Writer

1. **The index is a BST, not a B-tree** — much simpler to implement! No node splitting, no rebalancing.
2. **Page IDs encode the file index** — top 3 bits identify which .900/.1800 file.
3. **The dirty flag system** means you need to track which pages are modified.
4. **The linked list (prev/next)** provides sequential access without tree traversal.
5. **Page allocation** is just incrementing the page counter and appending to the file.
6. **Free pages** are tracked in a separate BST at offset +0x208.

## Index.1800 Serialization (from FUN_7ff78162ec80)

The Index file uses a custom serialization with:
- 8-page groups (1 directory + 7 data pages)
- Variable-size records (6-50 bytes) with a flags+seq header
- Field reordering (byte swizzle) when writing uint32 arrays to disk
- Records filled from END of data pages backwards
- Directory page has uint16 offset array for direct access

See `docs/index-1800-format.md` for complete format specification.

## Files Generated
174+ decompiled C files in `/Users/rudra/development/TallyWeb/TallyData/decompiled/`

Key files:
- `page_alloc_write_FUN_7ff78164c980.c` — BST insert algorithm
- `page_alloc_read_FUN_7ff78164c010.c` — BST delete algorithm
- `pageio_c1_23_FUN_7ff781618550.c` — Page allocator
- `pageio_c1_32_FUN_7ff78161a0e0.c` — Page lookup (file offset calc)
- `index_flush_8_FUN_7ff78162ec80.c` — Index serializer
- `index_flush_7_FUN_7ff78162e6f0.c` — Index deserializer
- `index_format_FUN_7ff782101230.c` — Index header initializer
- `impl_large_module.c` — Database file open/init
- `extra_FUN_7ff781616f30.c` — Object write pipeline (CREATE/UPDATE/DELETE)
