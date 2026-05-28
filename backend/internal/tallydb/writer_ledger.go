package tallydb

import (
	"encoding/binary"
	"fmt"
)

// WriteLedger creates a new ledger by cloning a template.
// If templateName is empty and no ledgers exist, uses genesis patch.
func (w *Writer) WriteLedger(templateName, newName string) (uint32, error) {
	return w.writeMaster(templateName, newName)
}

// WriteStockItem creates a new stock item by cloning a template.
func (w *Writer) WriteStockItem(templateName, newName string) (uint32, error) {
	return w.writeMaster(templateName, newName)
}

// WriteGroup creates a new group by cloning a template.
func (w *Writer) WriteGroup(templateName, newName string) (uint32, error) {
	return w.writeMaster(templateName, newName)
}

// writeMaster is the core clone+chain algorithm for any master type.
func (w *Writer) writeMaster(templateName, newName string) (uint32, error) {
	oldU16 := encodeUTF16LE(templateName)
	newU16 := encodeUTF16LE(newName)
	newU16 = padName(oldU16, newU16)

	// Find template
	tmplPidx2, tmplPidx0 := w.findTemplatePages(oldU16)
	if tmplPidx2 < 0 || tmplPidx0 < 0 {
		// No template found — use genesis for first ledger
		if templateName == "" || w.findAnyLedger() < 0 {
			return w.CreateFirstLedger(newName)
		}
		return 0, fmt.Errorf("template %q not found", templateName)
	}

	tmplSeq := binary.LittleEndian.Uint32(w.data[tmplPidx2*PageSize+4 : tmplPidx2*PageSize+8])
	newSeq := w.maxSeq() + 1

	// Append 2 new pages (pidx=2 + pidx=0)
	newPidx2 := w.totalPages()
	w.data = append(w.data, make([]byte, 2*PageSize)...)
	newPidx0 := newPidx2 + 1

	// Clone template pages
	copy(w.data[newPidx2*PageSize:], w.data[tmplPidx2*PageSize:(tmplPidx2+1)*PageSize])
	copy(w.data[newPidx0*PageSize:], w.data[tmplPidx0*PageSize:(tmplPidx0+1)*PageSize])

	// Update seq numbers
	binary.LittleEndian.PutUint32(w.data[newPidx2*PageSize+4:], newSeq)
	binary.LittleEndian.PutUint32(w.data[newPidx0*PageSize+4:], newSeq)

	// Replace name
	w.replaceName(newPidx2, oldU16, newU16)
	w.replaceName(newPidx0, oldU16, newU16)

	// Replace seq refs
	w.replaceSeqRefs(newPidx2, tmplSeq, newSeq)
	w.replaceSeqRefs(newPidx0, tmplSeq, newSeq)

	// New page is the new tail: clear chain pointers
	binary.LittleEndian.PutUint16(w.data[newPidx2*PageSize+58:], 0)
	binary.LittleEndian.PutUint16(w.data[newPidx2*PageSize+62:], 0)
	binary.LittleEndian.PutUint16(w.data[newPidx2*PageSize+66:], 0)

	// Link previous tail → new page
	tail := w.findChainTail(newPidx2)
	if tail >= 0 {
		binary.LittleEndian.PutUint16(w.data[tail*PageSize+58:], uint16(newPidx2))
		binary.LittleEndian.PutUint16(w.data[tail*PageSize+62:], uint16(newPidx2))
		binary.LittleEndian.PutUint16(w.data[tail*PageSize+66:], uint16(newPidx2))
		SetPageChecksum(w.data[tail*PageSize:(tail+1)*PageSize], tail)
	}

	// Increment B-tree counters
	w.incrementCounters()

	// Update file header
	binary.LittleEndian.PutUint32(w.data[8:12], uint32(w.totalPages()-1))
	binary.LittleEndian.PutUint32(w.data[12:16], newSeq)
	SetPageChecksum(w.data[0:PageSize], 0)

	// Fix checksums on new pages
	SetPageChecksum(w.data[newPidx2*PageSize:(newPidx2+1)*PageSize], newPidx2)
	SetPageChecksum(w.data[newPidx0*PageSize:(newPidx0+1)*PageSize], newPidx0)

	return newSeq, nil
}
