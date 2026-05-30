# How to Continue - Tally Reverse Engineering & TallyWeb

## Repository Structure

```
TallyWeb/
├── backend/                          Go REST API
│   └── internal/tallydb/            Binary reader/writer engine
│       ├── reader.go                 Page reader + TLV decoder
│       ├── fields.go                 Field ID constants
│       ├── checksum.go               Dual CRC-16/CCITT (CRACKED)
│       ├── writer.go                 Core writer + DeleteIndexFiles/DeleteCacheFiles
│       ├── writer_ledger.go          Master creation (clone+rename)
│       ├── writer_genesis.go         First ledger creation
│       ├── writer_voucher.go         Voucher creation (clone+modify)
│       ├── writer_voucher_test.go    Voucher write test (PASSING)
│       ├── writer_test.go            Master write test (PASSING)
│       ├── checksum_test.go          Checksum test (PASSING)
│       ├── masters.go                Master object parser
│       ├── vouchers.go               Voucher parser
│       └── db.go                     Database open/read
├── frontend/                         Next.js 15 dashboard
├── docs/                             Reverse engineering documentation
│   ├── reverse-engineering-progress.md   Progress tracker (32%)
│   ├── tally-binary-format.md            Core binary format spec
│   ├── tally-engine-reversing.md         Decompiled engine findings
│   ├── voucher-format.md                 Complete voucher structure
│   ├── index-1800-format.md              Index.1800 = search index
│   ├── tstate-tupdate-format.md          State/audit files
│   ├── all-data-files.md                 All files + delete strategy
│   ├── field-id-catalog.md               155 field IDs mapped
│   └── ledger-creation.md                Master write process
└── TallyData/                        (NOT in git - local only)
    ├── TallyPrime/                   Tally installation files
    ├── Tally-Data/020013_win/        Live company data (from Windows)
    ├── Developer Data/               Tally Developer SDK
    ├── tally_dumped.exe              Decrypted PE dump (48MB)
    ├── tally_full.dmp                Full memory dump (601MB)
    ├── decompiled/                   174 Ghidra decompiled C files
    └── ghidra_project/               Ghidra analysis project
```

## What's on the Windows Machine (rudra@100.90.170.51 via Tailscale)

- `C:\Program Files\TallyPrime\` — Tally installation
- `C:\Users\Public\TallyPrime\data\020013\` — Live company (with Index.1800)
- `C:\TallyData\Data\020013\` — Original company data
- `C:\Users\rudra\pe-sieve64.exe` — PE dumper tool
- `C:\Users\rudra\tally_dump2\` — Previous PE dumps
- Tally is running (port 9000 for XML API)

## Current Progress: 32%

### What's DONE:
- Binary encoding (pages, checksum, TLV, amounts, dates, quantities)
- Master read/write (Ledger, Group, StockItem)
- Voucher read (all types)
- Voucher write (clone approach, date replacement working)
- All auxiliary files understood (safe to delete)
- 155 field IDs mapped
- Engine internals decompiled (BST, page allocator, write pipeline)

### What's NEXT (to reach 50%):
1. **Fix search key replacement** in writer_voucher.go (the TLV field is at offset 220, not near page start)
2. **Add amount replacement** in line item pages (format: `[idx:2][00][08][int64:8][00 00]`)
3. **Test with real Tally** — push modified company to Windows, open in Tally, verify
4. **Map remaining field IDs** from ExtMngr.1800 (GST registration details)
5. **Implement Payment/Receipt voucher** write (simpler than Sales — no stock items)

### What's NEXT (to reach 70%):
6. Decode all 0x0042/pidx=0 overflow page format
7. Implement voucher write from scratch (not clone)
8. Add all voucher types (Journal, Contra, Credit/Debit Note)
9. Decode ExtMngr.1800 fully (GST, TDS, bank details)
10. Implement Aggr.1800 generation (balance computation)

## How to Resume Reverse Engineering

### To analyze binary files:
```python
import struct
path = '/Users/rudra/development/TallyWeb/TallyData/Tally-Data/020013_win/Manager.1800'
with open(path, 'rb') as f:
    data = f.read()
# Page N is at data[N*512:(N+1)*512]
# Header: [0-3]=checksum, [4-7]=seq, [8-11]=pidx, [16-17]=otype
```

### To decompile more functions from tally.exe:
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"
# Edit TallyDecompile.java with target addresses
/opt/homebrew/Cellar/ghidra/12.1/libexec/support/analyzeHeadless \
  /path/to/ghidra_project TallyEngine \
  -process tally_dumped.exe -noanalysis \
  -scriptPath /path/to/TallyData \
  -postScript TallyDecompile.java
```

### To dump tally.exe again (if updated):
```bash
ssh rudra@100.90.170.51
# Start Tally, then:
C:\Users\rudra\pe-sieve64.exe /pid <PID> /dir C:\Users\rudra\tally_dump /dmode 3 /imp 3
```

### To test writes with Tally:
```bash
# Push modified files to Windows
scp file.1800 rudra@100.90.170.51:"C:/Users/Public/TallyPrime/data/020013/"
# Delete cache files on Windows
ssh rudra@100.90.170.51 "del C:\Users\Public\TallyPrime\data\020013\Index.1800"
# Restart Tally and check if it opens without errors
```

## Key Findings Summary

1. **All data files use 512-byte pages** with dual CRC-16/CCITT checksum
2. **TLV encoding**: `[02 10][fid:2][00][type:1][data]` — type 0x0F=string, 0x06=uint32, 0x09=int64
3. **Dates**: Excel serial numbers (days since 30-Dec-1899)
4. **Amounts**: int64 in paise (value × 100)
5. **Quantities**: 6-byte signed int (negative=outward, positive=inward)
6. **Index.1800**: Voucher search index — NOT needed for master writes, safe to delete
7. **Aggr/VchStatus/StatStatus/TSTATE/TUPDATE**: All regenerable, safe to delete
8. **All voucher types share identical page structure** — clone approach works universally
9. **Page ID format**: [3-bit file_index][29-bit page_number]
10. **The engine uses a simple BST** (not B-tree) for in-memory page index
