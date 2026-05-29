package tallydb

import "fmt"

// CreateFirstLedger creates a ledger in a brand-new company that has no user ledgers.
// It applies a pre-captured binary patch to the standard Tally company structure.
// After this, the normal WriteLedger clone+chain method works for subsequent ledgers.
func (w *Writer) CreateFirstLedger(name string) (uint32, error) {
	if err := genesisValidate(w.data); err != nil {
		return 0, fmt.Errorf("cannot apply genesis patch: %w", err)
	}

	// Append 4 new pages from genesis template
	for i := 0; i < 4; i++ {
		w.data = append(w.data, genesisNewPages[i][:]...)
	}

	// Apply byte-level changes to existing pages
	for pn, changes := range genesisChanges {
		for _, c := range changes {
			w.data[pn*PageSize+c.offset] = c.value
		}
	}

	// Replace genesis placeholder name with requested name
	oldU16 := encodeUTF16LE(genesisLedgerName)
	newU16 := padName(oldU16, encodeUTF16LE(name))

	total := w.totalPages()
	for pn := total - 4; pn < total; pn++ {
		w.replaceName(pn, oldU16, newU16)
	}

	// Fix checksums on all modified + new pages
	for pn := range genesisChanges {
		SetPageChecksum(w.data[pn*PageSize:(pn+1)*PageSize], pn)
	}
	for pn := total - 4; pn < total; pn++ {
		SetPageChecksum(w.data[pn*PageSize:(pn+1)*PageSize], pn)
	}

	return 206, nil
}
