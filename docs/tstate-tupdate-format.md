# TSTATE.TSF & TUPDATE.TSF Formats

## TSTATE.TSF — State Tracking File

**Size:** ~1536 bytes (3 pages)
**Purpose:** Tracks internal object/page counts per data file
**Required for writes?** NO — Tally recomputes from data files on startup

### Structure (Page 0)
```
Offset  Size  Description
------  ----  -----------
0x00    24    Zeros (no checksum)
0x18    4     Total object count in Manager.1800 (~pidx=0 pages)
0x1C    4     Same (verification copy)
0x20    4     Previous count (before last batch operation)
0x24    4     Sub-count 1 (related to TranMgr)
0x28    4     Sub-count 2 (related to LinkMgr)
0x2C    4     Sub-count 3 (AddlCmp objects)
0x30    4     Sub-count 4
0x40    4     Counter A
0x44    4     Counter B
0x50    4     File count or version
0x78    4     Small counter
0x7C    4     Small counter
```

### Behavior
- Tally updates this on every save/close
- If missing or inconsistent, Tally rebuilds from data files
- Safe to delete — causes a slightly longer startup as Tally recomputes

## TUPDATE.TSF — Transaction/Audit Log

**Size:** Variable (8KB+ depending on history)
**Purpose:** Audit trail of all create/modify/delete operations
**Required for writes?** NO — purely informational

### Structure

**Page 0 (Header):**
```
Offset  Size  Description
------  ----  -----------
0x00    4     Checksum
0x04    4     Reserved (0)
0x08    4     Total entries (15 in sample)
0x0C    4     Entry type count
0x10    4     Version (4)
0x14    4     Flags (1)
0x18    4     Max entries
0x1C    4     Current entries
0x20    4     0xFFFFFFFF marker
0x24    4     0x00010000 (page size indicator)
```

**Pages 1+ (Log Entries):**
Each page is a log entry using the same TLV format as data files:
```
Field ID  Description
--------  -----------
0x0002    File path that was modified
0x0003    Session GUID (identifies the editing session)
0x001B    Object name (e.g., "ABCDEF Group")
0x001E    Session GUID (repeated)
0x0067    State/Location
0x00D2    Country
0x03EA    Tally version (e.g., "TallyPrime - 4.0 (Beta)")
0x13F0    Username who made the change
```

### Behavior
- Grows with each operation (create/alter/delete)
- Used for sync, replication, and audit
- Safe to delete — no impact on data integrity
- Tally creates a fresh one on next operation

## Practical Implication for Writer

The current approach in `writer.go` is correct:
```go
func DeleteIndexFiles(companyDir string) {
    for _, f := range []string{"Index.1800", "TSTATE.TSF", "TUPDATE.TSF"} {
        os.Remove(companyDir + "/" + f)
    }
}
```

All three files are **optional/regenerable**:
- Index.1800: Search index for vouchers (rebuilt on startup)
- TSTATE.TSF: Object counters (recomputed from data)
- TUPDATE.TSF: Audit log (fresh one created on next operation)

Deleting them forces Tally to do a clean rebuild, which is actually
MORE reliable than trying to maintain them manually.
