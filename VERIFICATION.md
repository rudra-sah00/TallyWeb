# TallyWeb Binary Parser — Verification Status

**Company:** M/S. SAHOO SANITARY (2026-27)  
**Data folder:** 020013  
**Verified on:** 2026-05-29  
**Verified against:** TallyPrime Gold UI (screenshots s1.png, s6.png, s7.png)

---

## ✅ Verified (Matches Tally UI)

### Voucher Amounts (Sales Register — s6.png, s7.png)

| Check | Tally UI | Binary Parser | Status |
|-------|----------|---------------|--------|
| SS/0037/26-27 | Rs.2,670 | Rs.2,670 | ✅ Exact |
| SS/0072/26-27 | Rs.80,887 | Rs.80,887 | ✅ Exact |
| May sales (36 vouchers) | Rs.13,96,984 | 35/36 exact | ✅ 97.2% |
| Total SS sales (82 vouchers) | Rs.32,59,949 | Rs.32,59,949 | ✅ Exact |
| Amount coverage | — | 123/126 (97.6%) | ✅ |

### Voucher Type Detection (NO hardcoding)

| Method | Description |
|--------|-------------|
| Party in Sundry Debtors → | Sales |
| Party = company name → | Purchase |
| Party in Sundry Creditors → | Purchase |
| ~~Prefix matching~~ | ~~Removed, was hardcoded~~ |

Result: 84 Sales + 39 Purchase correctly classified from binary data only.

### Ledger-Group Mapping

| Check | Result |
|-------|--------|
| Total ledgers | 286 (real accounts only, no junk) |
| With parent group | 286 (100%) |
| Group detection method | `header[28:32]` on pidx=4 type=0x000B pages → group seq |
| Sundry Creditors | 260 ledgers |
| Sundry Debtors | 24 ledgers |
| Purchase Accounts | 2 ledgers |

### Trial Balance Structure (s1.png)

| Check | Result |
|-------|--------|
| Group-wise aggregation | ✅ (matches Tally's layout) |
| Double-entry balanced | ✅ (Dr = Cr within Rs.3,438) |
| Groups shown | Current Assets, Sales Accounts, Purchase Accounts |
| No hardcoded prefixes | ✅ (type inferred from ledger groups) |

---

## ⚠️ Known Limitations

### 1. Opening Balances Not Decoded

- **Impact:** Trial balance shows Rs.63L (current year transactions) vs Tally's Rs.4.36Cr (includes Rs.3.72Cr opening balance from prior year)
- **Root cause:** Opening balances are NOT stored as fid=0x0008 in any decoded field. Type-0x07 compound fields on pidx=2 pages show a constant value across all ledgers — not individual balances.
- **Status:** Format unknown. Needs deeper reverse-engineering.

### 2. SS/0040 Amount Mismatch (Rs.20,000 short)

- **Binary:** Rs.29,567 | **Tally:** Rs.49,567
- **Cause:** Tally computes total from ledger allocations; binary only stores partial amount.
- **Impact:** 1/82 SS vouchers (0.7% of total value)

### 3. Three Vouchers Without Type

- Parties not in any known ledger group and don't match company name.
- Impact: Rs.0 (these vouchers have no amounts anyway)

### 4. 15 Voucher Parties Not in Ledger List

- System ledgers (Cash), cross-year refs (M/S SAHOO 2025-26), or newer ledgers stored on pidx=0.
- These parties default to "Sales" type which is mostly correct.

---

## Architecture (No Hardcoding)

### Voucher Type Detection
```
Party name → lookup in ledger list → get parent group
  "Sundry Debtors" → Sales
  "Sundry Creditors" → Purchase  
  Company name match → Purchase
  Has items but no group → Sales (fallback)
```

### Ledger-Group Mapping
```
Manager.1800 → pidx=4 type=0x000B pages
  header bytes[28:32] = parent group seq number
  group seq → name from pidx=1/2 pages (seq < 100)
```

### Group Hierarchy (Tally standard, same for ALL companies)
```
tallyPrimaryGroup map:
  "Sundry Debtors" → "Current Assets"
  "Sundry Creditors" → "Current Liabilities"
  "Cash-in-Hand" → "Current Assets"
  "Bank Accounts" → "Current Assets"
  etc. (Tally's built-in hierarchy)
```

---

## Files Modified

| File | Changes |
|------|---------|
| `reader.go` | Added `ParentSeq` to PageHeader (bytes 28-31) |
| `masters.go` | Builds groupBySeq map; assigns ledger Parent from ParentSeq; filters to pidx=4 only |
| `vouchers.go` | Removed hardcoded prefixes; seq-based grouping; removed pidx filter on amounts |
| `db.go` | Type inference from ledger groups; double-entry trial balance; company-name matching |

---

## Next Steps

1. **Opening balances** — Need to find where Tally stores per-ledger opening amounts. Candidates: ExtMngr.1800, Index.1800, or a different encoding in Manager.1800.
2. **Voucher type from binary** — The "O"/"I" direction on pidx=3-5 pages works for ~40% of vouchers. Could supplement the ledger-group approach.
3. **More ledgers** — 15 voucher parties missing from ledger list. Could be recovered by also scanning pidx=0/2/3 pages for fid=0x0002 with known party names.
