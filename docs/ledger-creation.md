# Ledger Creation — Complete Guide

## Overview

TallyWeb can create ledgers directly in TallyPrime's binary database files without Tally running. Works on:
- ✅ Existing companies (any size, any number of existing ledgers)
- ✅ Brand new companies (zero manual steps required)

---

## How It Works

### New Company (No Existing Ledgers)

When the company has no user-created ledgers, a **genesis patch** is applied:

1. Validates the file structure (standard 369-page Tally template)
2. Appends 4 pages (pidx=2 string data, two 0x0042 index nodes, pidx=0 name index)
3. Modifies 7 existing pages (header, group nodes, pointers)
4. Replaces placeholder name with requested ledger name
5. Fixes all checksums

After this, the company has one ledger and the normal clone method works.

### Existing Company (Has Ledgers)

Uses the **clone + chain** method:

1. Finds an existing ledger as template (by name search)
2. Clones its pidx=2 and pidx=0 pages
3. Replaces name (padded/truncated to template length)
4. Links new pages into sibling chain (offsets 58, 62, 66)
5. Increments B-tree counters on 0x0042 pages
6. Updates file header
7. Fixes checksums

---

## REST API

### Create Ledger

```http
POST /api/ledgers
Content-Type: application/json
```

**For new company (auto genesis):**
```json
{"name": "My Ledger", "template": ""}
```

**For existing company (clone from template):**
```json
{"name": "HDFC Bank", "template": "MY LEDGER"}
```

**Response (201):**
```json
{"name": "HDFC Bank", "seq": 207}
```

### Batch Create

Call multiple times — each call chains onto the previous:
```bash
curl -X POST /api/ledgers -d '{"name":"Ledger 1","template":""}'
curl -X POST /api/ledgers -d '{"name":"Ledger 2","template":"Ledger 1"}'
curl -X POST /api/ledgers -d '{"name":"Ledger 3","template":"Ledger 1"}'
```

---

## Name Length Rules

- **Genesis template:** 9 characters (FIRSTLEDG)
- Names shorter than template: padded with spaces
- Names longer than template: truncated
- Best practice: create a template with a long name, then all shorter names work

---

## After Writing

The following files must be deleted for Tally to rebuild its indexes:
- `Index.1800`
- `TSTATE.TSF`
- `TUPDATE.TSF`

Tally rebuilds these automatically on next company open (~1-2 seconds).

---

## Supported Master Types

| Type | Method | Template Needed |
|------|--------|-----------------|
| Ledger | `WriteLedger(template, name)` | Yes (or empty for genesis) |
| Stock Item | `WriteStockItem(template, name)` | Yes (manual template) |
| Group | `WriteGroup(template, name)` | Yes (manual template) |

All types use the same clone+chain mechanism. The only difference is which existing object you clone from.

---

## Requirements

1. **Tally must be closed** — file is locked while Tally runs
2. **Company must exist** — create via Tally GUI first (just the company, no masters needed)
3. **Index files deleted** — after any write, delete Index + TSF files

---

## Error Cases

| Error | Cause | Fix |
|-------|-------|-----|
| "template not found" | No ledger with that name exists | Use empty string for genesis |
| "cannot apply genesis patch" | File structure doesn't match standard template | Create one ledger manually in Tally |
| "file too small" | Corrupted or non-standard company | Recreate company |

---

## Example: Full Workflow

```go
// Open the company's Manager.1800
w, err := tallydb.OpenWriter("/path/to/Manager.1800")

// Create first ledger (uses genesis if empty company)
w.WriteLedger("", "My First Ledger")

// Create more (clones from existing)
w.WriteLedger("My First Ledger", "Second Ledger")
w.WriteLedger("My First Ledger", "Third Ledger")

// Save and clean up
w.Save()
tallydb.DeleteIndexFiles("/path/to/company/")
```

---

*Part of TallyWeb — Binary database engine for TallyPrime*
