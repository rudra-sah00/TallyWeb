# Voucher Write Format (TranMgr.1800 + LinkMgr.1800)

## Overview

A voucher (Sales Invoice, Purchase, Payment, Receipt, Journal) is stored across
TWO files:
- **TranMgr.1800**: Voucher header, party info, line items, GST data
- **LinkMgr.1800**: Bill allocations, batch allocations, ledger cross-references

Each voucher in TranMgr creates ~38 entries in LinkMgr (varies by complexity).

## TranMgr.1800 Structure

### File Stats (sample company)
- 10,409 pages, max_seq=454
- 114 vouchers (each uses ~90 pages average)

### Page Types per Voucher

| otype | pidx | Purpose | Count per voucher |
|-------|------|---------|-------------------|
| 0x0003 | 0 | Search key (additional) | 1 |
| 0x0003 | 2 | Search key (primary: Year+Type+Number) | 1 |
| 0x000B | 1 | Voucher header (numeric: date, amounts) | 1 |
| 0x0005 | 0 | Line items (stock items, HSN, amounts) | N (1 per ~2 items) |
| 0x0005 | 1 | GST details per entry | 1+ |
| 0x0005 | 12 | E-invoice/E-way bill data | 0-1 |
| 0x0005 | 29 | Party reference (name, invoice#) | 1 |
| 0x000A | 1 | Narration/notes | 0-1 |
| 0x0042 | 0 | Counters and chain pointers | N |
| 0x0042 | 2 | Metadata (created by, revision, ref) | 1-2 |

### Search Key Format (otype=0x0003, pidx=2)

```
fid=0x0002: "Year\x05VoucherTypeSeq\x05VoucherTypeName\x05VoucherNumber"
```

Example: `"2026\x0543846\x05Outward Invoice\x05SS/0001/26-27"`

Fields separated by `\x05` (ENQ character):
1. Financial year (4 digits)
2. Voucher type sequence from Manager.1800
3. Voucher type display name
4. Voucher number (user-visible)

### Party/Invoice Fields (otype=0x0005, pidx=0, first pages)

| Field ID | Description | Example |
|----------|-------------|---------|
| 0x0006 | Invoice number | "SS/0001/26-27" |
| 0x0008 | Country | "India" |
| 0x000D | Party ledger name | "Nirod Ku Behera (Roda)" |
| 0x000E | State | "Odisha" |
| 0x000F | GST registration type | "Regular" |
| 0x0016 | Party display name | "Nirod Ku Behera (Roda)" |
| 0x0017 | Address lines (repeated) | "Roda,Panibhandara..." |
| 0x0018 | Pincode | "759120" |
| 0x0023 | Buyer GSTIN | "21ARBPB3201C3Z3" |
| 0x0025 | Buyer address (repeated) | "Roda,Panibhandara..." |
| 0x0026 | Buyer pincode | "759120" |
| 0x0027 | Buyer state | "Odisha" |
| 0x0028 | Dispatch state | "Odisha" |
| 0x002A | Buyer country | "India" |

### Line Item Fields (otype=0x0005, pidx=0, subsequent pages)

Multiple items per page. Each item:

| Field ID | Description | Example |
|----------|-------------|---------|
| 0x0001 | Item display name | "Upvc Brass Tee Sch-80 3/4x1/2" |
| 0x0002 | Item formal name | "Upvc Brass Tee Sch-80 3/4x1/2" |
| 0x0003 | HSN code | "39172390" |
| 0x0004 | Unit short name | "PCS" |
| 0x0079 | HSN (voucher level) | "39172390" |
| 0x007B | Unit formal name | "PCS-PIECES" |

### GST Entry Fields (otype=0x0005, pidx=1)

| Field ID | Description | Example |
|----------|-------------|---------|
| 0x0004 | Invoice reference | "SS/0001/26-27" |
| 0x0006 | Invoice date | "03-04-2026" |
| 0x0007 | Registration type code | "R" |
| 0x000C | State code | "21" |
| 0x000D | Reverse charge flag | "N" |
| 0x000F | Buyer GSTIN | "21ARBPB3201C3Z3" |

### Voucher Metadata (otype=0x0042, pidx=2)

| Field ID | Description | Example |
|----------|-------------|---------|
| 0x0003 | Internal reference | "0000b422-00000004-00000020" |
| 0x07D3 | Created by user | "satyananda" |
| 0x07D5 | Revision number | "3" |

### Voucher Identity (otype=0x0042, pidx=0)

| Field ID | Description | Example |
|----------|-------------|---------|
| 0x000A | Voucher GUID | "5R4OfdrYkFArvVIc" |
| 0x0212 | State | "Odisha" |
| 0x0213 | Company GSTIN | "21AVHPS3206Q1ZC" |

## LinkMgr.1800 Structure

### File Stats
- 8,304 pages, max_seq=4373
- ~38 entries per voucher (bill allocs + batch allocs + cross-refs)
- Seq space is INDEPENDENT from TranMgr (but overlaps for first 443)

### Page Types

| otype | pidx | Purpose | Pages |
|-------|------|---------|-------|
| 0x0000 | 0 | Ledger amount entries (numeric) | 316 |
| 0x0000 | 1 | Batch name ("Primary Batch") | 939 |
| 0x0000 | 2 | Batch allocation details | 2730 |
| 0x0000 | 3 | Bill allocation amounts | 345 |
| 0x0000 | 4-7 | Additional allocations | 84 |
| 0x0004 | 0-6 | Stock batch tracking | 169 |
| 0x0006 | 0 | Bank reconciliation | 20 |

### Key Observations
- LinkMgr is mostly NUMERIC (amounts, dates, seq references)
- Only string field commonly seen: `fid=0x0002: "Primary Batch"`
- Each stock item in a voucher creates batch allocation entries
- Bill allocations track outstanding amounts per invoice

## Writing a Voucher (Minimum Required)

For a simple Payment/Receipt voucher (no stock):

### TranMgr.1800 pages needed:
1. **otype=0x000B, pidx=1**: Header (date, voucher type seq, amounts)
2. **otype=0x0003, pidx=2**: Search key (Year+Type+Number)
3. **otype=0x0003, pidx=0**: Additional search data
4. **otype=0x0042, pidx=0**: GUID, state, GSTIN
5. **otype=0x0042, pidx=2**: Created by, revision

### LinkMgr.1800 pages needed:
1. **otype=0x0000, pidx=0**: Debit ledger entry (amount)
2. **otype=0x0000, pidx=0**: Credit ledger entry (amount)
3. **otype=0x0000, pidx=3**: Bill allocation (if applicable)

### For a Sales Invoice (with stock):
Add per item:
- **TranMgr otype=0x0005, pidx=0**: Item name, HSN, unit, amount
- **LinkMgr otype=0x0000, pidx=1-2**: Batch allocation

## Numeric Field Encoding

### Voucher Header Page (otype=0x000B, pidx=1) - Fixed Binary

```
Offset  Size  Description
------  ----  -----------
[18-19] 2     Zero padding
[20-23] 4     0xFFFFFFFF marker
[24-27] 4     Zero
[28-31] 4     Page count indicator (34=full, 24=minimal)
[32-35] 4     Always 1 (file index)
[36-39] 4     Always 3 (sub-file count)
[40-43] 4     Reference page 1 (0x0042/pidx=4 page number)
[44-47] 4     Reference page 2 (0x0042/pidx=63 page number)
[48-51] 4     Flags (0x0400=has stock, 0x0000=no stock)
[52+]   var   Internal counters
```

For clone approach: update [40-43] and [44-47] to point to new pages.

### Date/Type Reference Page (otype=0x0042, pidx=4) - 10-byte Records

Header (bytes 18-47):
```
[18-19]: padding
[20-23]: entry count (1)
[24-25]: 0x000B (otype marker)
[26-27]: 0xFFFF
[28-47]: seq references to Manager.1800 objects (ledgers, groups)
```

10-byte records (offset 48+): `[fid:2][type:2][val:2][extra:4]`

Key fields:
| Field ID | Type | Description |
|----------|------|-------------|
| 0x00CB | 0x0300 | Voucher type seq (from Manager.1800) |
| 0x00CC | 0x0300 | Voucher number series seq |
| 0x00CD | 0x0200 | First data page offset |
| 0x00CE | 0x0200 | Self-reference page |
| 0x00D0 | 0x0300 | Related voucher type seq |
| 0x01F7 | 0x0200 | Page reference |
| 0x01F8 | 0x0200 | Page reference |
| 0x01F9 | 0x0300 | Voucher type seq (43846="Outward Invoice") |
| **0x07D4** | **0x0600** | **Creation date (Excel serial, uint16 in val field)** |
| 0x0BBB | 0x0600 | Additional date/flag |

Date encoding: `val` field contains Excel serial number (days since 30-Dec-1899).
Example: 46074 = 21-Feb-2026, 46114 = 2-Apr-2026.

### Date Format
Tally stores dates as **Excel serial numbers** (days since 30-Dec-1899):
- `46114` = 2-Apr-2026
- `46112` = 31-Mar-2026 (FY start)

Conversion: `date = datetime(1900,1,1) + timedelta(days=serial-2)`

### Compact Binary Format (otype=0x0042 pages)

The 0x0042 pages use a 10-byte record format (NOT TLV):
```
[field_id: 2 bytes LE] [type: 2 bytes LE] [value: 2 bytes LE] [extra: 4 bytes]
```

Type markers:
- `0x0200`: uint16 value (page reference, small count)
- `0x0300`: uint16 value (seq reference, object ID)
- `0x0600`: uint32 value (value spans bytes 4-7, i.e., val + extra[0:2])

Key fields in voucher 0x0042 pages:
| Field ID | Type | Description |
|----------|------|-------------|
| 0x00CB | 0x0300 | Voucher type seq (from Manager.1800) |
| 0x00CC | 0x0300 | Voucher number seq |
| 0x00CD | 0x0200 | Page reference (data start) |
| 0x00CE | 0x0200 | Page reference (party/narration) |
| 0x00D0 | 0x0300 | Related voucher type |
| 0x01F7 | 0x0200 | Reference count 1 |
| 0x01F8 | 0x0200 | Reference count 2 |
| 0x01F9 | 0x0300 | Voucher type seq (43846 = "Outward Invoice") |
| 0x05DF | 0x0200 | Counter |
| 0x05E1 | 0x0200 | Counter |
| 0x07D4 | 0x0600 | Date (Excel serial as uint32) |
| 0x0BBB | 0x0600 | Additional date/flag |

### Amount Encoding
Amounts are stored as **int64 in paise** (value × 100):
- Found in TLV fields with type byte `0x09`
- Format: `[0x02][0x10][fid:2][0x00][0x09][int64:8]` = 14 bytes total
- Example: 150000 = ₹1,500.00

### Quantity Encoding (in line item pages)

Structure per item (otype=0x0005, pidx=0):
```
[18-25] Header: [00 00][item_count:2 LE][00 00][0x03][0x02]
[26-27] Padding: 00 00
[28-33] Quantity: 6-byte signed integer
         Negative = outward (sold/issued)
         Positive = inward (purchased/received)
         Example: -2 = 2 units sold
[34-35] Unit reference: uint16 (seq of Unit master in Manager.1800)
[36-39] Padding: 00 00 00 00
[40+]   Amount entries (14 bytes each):
         [index:2 LE][0x00][type=0x08:1][amount:int64 LE:8][0x00 0x00]
         idx=1: Rate per unit (in paise)
         idx=2: Rate (display copy)
         idx=3: Total line amount
         idx=4: Tax amount
         idx=5: Tax (verification copy)
[after amounts] TLV string fields (item name, HSN, unit)
```

### Line Item Amount Block (otype=0x0005, pidx=0)

Between TLV strings, amounts use a compact format:
```
[index: 2 bytes LE] [0x00] [0x08] [int64 amount: 8 bytes] [0x00 0x00]
= 14 bytes per entry
```

Indices per item:
- idx=1: Rate per unit
- idx=2: Quantity (as amount × 100)
- idx=3: Total line amount
- idx=4: Tax amount
- idx=5: Tax amount (duplicate/verification)

### LinkMgr Amount Format (otype=0x0000, pidx=0)

First entry (12 bytes):
```
[field_id: 2] [0x00] [type=0x09: 1] [amount: int64 8 bytes]
```

Continuation entries (18 bytes each):
```
[prefix=0x0080: 2] [field_id: 2] [type=0x000B: 2] [amount: int64 8] [ref: uint32 4]
```

Field IDs for tax components:
- 0x35EC: CGST amount
- 0x35EE: SGST amount  
- 0x35EF: Total taxable amount
- 0x35F0: IGST amount

Negative values = credit entries.

## Minimum Viable Voucher (by type)

All voucher types share the SAME page structure. The only difference is:
- Number of 0x0005/p0 pages (scales with line items)
- Presence of stock-related fields (Sales/Purchase vs Payment/Receipt)

### Absolute Minimum (3 pages - system voucher):
```
otype=0x000B pidx=1  — Header (date, type seq, amounts as binary)
otype=0x0042 pidx=1  — Counter/chain (2 pages)
```

### User-Visible Minimum (10 pages - e.g., GSTR-1 entry):
```
otype=0x000B pidx=1  — Header
otype=0x0003 pidx=2  — Search key (Year+Type+Number)
otype=0x0003 pidx=0  — Additional search data
otype=0x0005 pidx=1  — GST/state details (3 pages)
otype=0x000A pidx=1  — Narration
otype=0x0042 pidx=0  — GUID, state, GSTIN
otype=0x0042 pidx=1  — Counter
otype=0x0042 pidx=2  — Metadata (created by, revision)
```

### Sales Invoice (68-120 pages):
Same as above PLUS:
```
otype=0x0005 pidx=0   — Party info + line items (N pages, ~2 items/page)
otype=0x0005 pidx=12  — E-invoice data
otype=0x0005 pidx=29  — Party reference
otype=0x0042 pidx=0   — Overflow data (many pages)
otype=0x0042 pidx=4   — Compact references (date, type, page refs)
```

### Key Insight for Clone Approach
ALL voucher types use identical page types. To create a Payment voucher
from a Sales template, you just:
1. Clone the template
2. Remove the 0x0005/p0 stock item pages
3. Keep the accounting entries (in 0x0042 overflow pages)
4. Update the search key, date, party, amounts

Or better: clone a PAYMENT voucher template for payments, clone a SALES
template for sales. Same type → same structure → just replace fields.

## Practical Approach

Same as master writer — **clone an existing voucher template**:
1. Find a voucher of the same type (Sales, Purchase, etc.)
2. Clone all its pages
3. Replace: date, number, party, amounts, items
4. Assign new seq numbers
5. Append to TranMgr.1800 and LinkMgr.1800
6. Update both file headers
7. Delete Index.1800 / TSTATE.TSF / TUPDATE.TSF
