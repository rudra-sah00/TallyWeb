# TallyPrime Binary Format — Complete Reverse Engineering

> Cracked TallyPrime's proprietary database. Read AND write masters
> directly to .1800 files — without Tally running.

---

## What We Built

| Feature | Status |
|---------|--------|
| Page checksum algorithm | ✅ Cracked (dual CRC-16/CCITT) |
| Binary reader (all masters + vouchers) | ✅ Working |
| Ledger creation — existing company | ✅ Working |
| Ledger creation — brand new company | ✅ Working (genesis patch) |
| Stock item creation | ✅ Working |
| Batch writes (unlimited ledgers) | ✅ Working |
| REST API (POST /api/ledgers) | ✅ Working |
| Voucher creation | ❌ Not yet (needs WAL format) |

---

## How It Works

### Reading

Direct binary parsing of `.1800` files. No Tally needed.

```
Manager.1800 → Parse pages → Extract fields → JSON output
```

### Writing (Existing Company)

Clone an existing ledger's pages, replace name, link into chain.

```
1. Find template ledger (by name search in file)
2. Clone its pidx=2 + pidx=0 pages
3. Replace name (pad/truncate to match)
4. Link: set previous tail's [58/62/66] → new page
5. Increment 0x0042 counter pages [34]++
6. Update header (page count + max seq)
7. Fix checksums
8. Delete Index.1800 + TSF files
```

### Writing (Brand New Company)

Apply a pre-captured "genesis patch" that creates the first ledger.

```
1. Detect: no user ledgers exist
2. Validate: file structure matches (page 24=seq20, page 33=seq29)
3. Apply genesis patch (4 new pages + 7 page modifications)
4. Replace placeholder name with requested name
5. Fix checksums
6. After first ledger exists → normal clone method works
```

---

## File Format

### Pages (512 bytes each)

```
Offset  Size  Field
0       4     Checksum (dual CRC-16, page_number as seed)
4       4     SeqNum (object ID)
8       4     PageIdx (0=index, 1=main, 2=strings)
12      4     Flags
16      2     ObjType (0x000B=master, 0x0042=link)
18      2     Reserved
20      4     NumPages
24+           Content
```

### Checksum

```
Polynomial: CRC-CCITT 0x1021
Seed: crc1 = crc2 = page_number & 0xFFFF
Process 508 bytes in pairs:
  CRC1 ← even bytes, CRC2 ← odd bytes
Result: (CRC1 << 16) + CRC2
```

Verified: 53,489 pages across 15 files — 100% match.

### String Fields

```
02 10 [FieldID LE16] 00 0F [ByteLen LE16] [UTF-16LE + null]
```

### Sibling Chain (offsets 58, 62, 66)

Ledger pages (pidx=2) are linked via uint16 page numbers at offsets 58, 62, and 66. Tail page has all three = 0.

### Counter Pages (type 0x0042)

B-tree index nodes. Offset 34 holds child count — incremented by 1 per new ledger.

---

## API

### Create Ledger

```http
POST /api/ledgers
Content-Type: application/json

{"name": "HDFC Bank", "template": "MY LEDGER"}
```

Template can be empty string `""` — auto-detects or uses genesis.

### Response

```json
{"name": "HDFC Bank", "seq": 207}
```

### List Ledgers

```http
GET /api/ledgers
```

---

## Architecture

```
┌──────────────────────────────────────────────┐
│            TallyWeb                          │
├──────────────────────────────────────────────┤
│  Next.js Frontend                            │
│       ↓ POST /api/ledgers                    │
│  Go Backend (port 8080)                      │
│       ↓                                      │
│  tallydb.Writer                              │
│    ├─ No ledgers? → Genesis patch            │
│    └─ Has ledgers? → Clone + chain           │
│       ↓                                      │
│  Manager.1800                                │
│       ↓                                      │
│  Tally opens → rebuilds index → sees it      │
└──────────────────────────────────────────────┘
```

---

## Key Discoveries

1. **Checksum** — Dual CRC-16/CCITT with page number as seed. Found via Frida Stalker tracing 5000 instructions after NtReadFile hook.

2. **VMProtect** — tally.exe is fully virtualized. All RE done dynamically.

3. **Sibling chain** — Pages linked at offsets 58/62/66 (all three must be set, not just 62).

4. **Counter pages** — Type 0x0042 pages track child counts at offset 34.

5. **Genesis patch** — All fresh Tally companies start with identical 369-page structure. One patch creates the first ledger in any new company.

6. **Vouchers use WAL** — Written to TUPDATE.TSF first, applied to .1800 on next open. Complex multi-file B-tree with reference-based amounts.

---

## Limitations

- **Ledger names** padded/truncated to template length (9 chars for genesis)
- **Parent group** inherited from template (Sundry Debtors for genesis)
- **Voucher creation** not yet supported
- **Index rebuild required** — must delete Index.1800 + TSTATE.TSF + TUPDATE.TSF after writes
- **Tally must be closed** during writes (file locking)

---

## Files Modified

```
backend/internal/tallydb/
├── checksum.go          # CRC-16 dual algorithm
├── checksum_test.go     # Verified 25,000+ pages
├── writer.go            # Clone+chain writer
├── writer_test.go       # Tests
├── genesis.go           # Embedded first-ledger patch
├── db.go                # CreateLedger/StockItem/Group methods
├── reader.go            # Binary page parser
├── masters.go           # Master extraction
└── fields.go            # Field decoding

backend/internal/handler/
├── ledgers.go           # POST /api/ledgers
├── stock.go             # POST /api/stock-items
└── groups.go            # POST /api/groups

backend/cmd/server/
└── main.go              # Routes registered

docs/
├── tally-binary-format.md  # This file
└── ledger-creation.md      # API documentation
```

---

## Tools Used

| Tool | Purpose |
|------|---------|
| Frida + Stalker | Dynamic instrumentation, CRC extraction |
| Python | Prototyping, patch creation, testing |
| Go | Production implementation |
| Before/After diffing | Understanding write patterns |
| SSH/SCP | Remote Windows access |

---

*Built: May 2026 | Rudra Sahoo + Kiro AI*
