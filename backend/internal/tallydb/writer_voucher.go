package tallydb

import (
	"encoding/binary"
	"fmt"
	"time"
)

// VoucherWriter handles writing vouchers to TranMgr.1800 + LinkMgr.1800.
type VoucherWriter struct {
	tranW *Writer
	linkW *Writer
	dir   string
}

// OpenVoucherWriter opens both TranMgr and LinkMgr for writing.
func OpenVoucherWriter(companyDir string) (*VoucherWriter, error) {
	tranPath := ResolveFile(companyDir, "TranMgr")
	linkPath := ResolveFile(companyDir, "LinkMgr")

	if tranPath == "" || linkPath == "" {
		return nil, fmt.Errorf("TranMgr or LinkMgr not found in %s", companyDir)
	}

	tranW, err := OpenWriter(tranPath)
	if err != nil {
		return nil, fmt.Errorf("open TranMgr: %w", err)
	}
	linkW, err := OpenWriter(linkPath)
	if err != nil {
		return nil, fmt.Errorf("open LinkMgr: %w", err)
	}
	return &VoucherWriter{tranW: tranW, linkW: linkW, dir: companyDir}, nil
}

// WriteVoucher creates a voucher by cloning an existing one of the same type.
// templateSeq is the seq of an existing voucher to use as template.
// Returns the new seq number.
func (vw *VoucherWriter) WriteVoucher(templateSeq uint32, v VoucherWriteData) (uint32, error) {
	// Find all template pages in TranMgr
	tmplPages := vw.findPagesBySeq(vw.tranW, templateSeq)
	if len(tmplPages) == 0 {
		return 0, fmt.Errorf("template voucher seq=%d not found in TranMgr", templateSeq)
	}

	newSeq := vw.tranW.maxSeq() + 1

	// Clone all template pages with new seq
	newStart := vw.tranW.totalPages()
	for _, pn := range tmplPages {
		vw.tranW.data = append(vw.tranW.data, make([]byte, PageSize)...)
		newPn := vw.tranW.totalPages() - 1
		copy(vw.tranW.data[newPn*PageSize:], vw.tranW.data[pn*PageSize:(pn+1)*PageSize])
		// Update seq
		binary.LittleEndian.PutUint32(vw.tranW.data[newPn*PageSize+4:], newSeq)
	}

	// Replace fields in the cloned pages
	vw.replaceVoucherFields(newStart, v)

	// Update TranMgr header
	binary.LittleEndian.PutUint32(vw.tranW.data[8:12], uint32(vw.tranW.totalPages()-1))
	binary.LittleEndian.PutUint32(vw.tranW.data[12:16], newSeq)
	SetPageChecksum(vw.tranW.data[0:PageSize], 0)

	// Fix checksums on all new pages
	for pn := newStart; pn < vw.tranW.totalPages(); pn++ {
		SetPageChecksum(vw.tranW.data[pn*PageSize:(pn+1)*PageSize], pn)
	}

	// Clone corresponding LinkMgr entries if template has them
	vw.cloneLinkEntries(templateSeq, newSeq)

	return newSeq, nil
}

// Save writes both files and deletes auxiliary files.
func (vw *VoucherWriter) Save() error {
	if err := vw.tranW.Save(); err != nil {
		return err
	}
	if err := vw.linkW.Save(); err != nil {
		return err
	}
	DeleteCacheFiles(vw.dir)
	return nil
}

// VoucherWriteData holds the fields to write into a new voucher.
type VoucherWriteData struct {
	Number string // Voucher number (e.g., "SS/0010/26-27")
	Date   string // Date as "DD-MM-YYYY"
	Party  string // Party ledger name
	Amount int64  // Total amount in paise (value * 100)
}

// --- Internal ---

func (vw *VoucherWriter) findPagesBySeq(w *Writer, seq uint32) []int {
	var pages []int
	for pn := 1; pn < w.totalPages(); pn++ {
		s := binary.LittleEndian.Uint32(w.data[pn*PageSize+4 : pn*PageSize+8])
		if s == seq {
			pages = append(pages, pn)
		}
	}
	return pages
}

func (vw *VoucherWriter) replaceVoucherFields(startPage int, v VoucherWriteData) {
	total := vw.tranW.totalPages()
	for pn := startPage; pn < total; pn++ {
		page := vw.tranW.data[pn*PageSize : (pn+1)*PageSize]
		otype := binary.LittleEndian.Uint16(page[16:18])
		pidx := binary.LittleEndian.Uint32(page[8:12])

		// Replace voucher number in search key page
		if otype == 0x0003 && pidx == 2 {
			vw.replaceSearchKey(pn, v)
		}

		// Replace party name in data pages
		if v.Party != "" && otype == 0x0005 && pidx == 0 {
			vw.replaceTLVField(pn, 0x000D, v.Party)
			vw.replaceTLVField(pn, 0x0016, v.Party)
		}

		// Replace date in 0x0042/pidx=4 page (field 0x07D4, type 0x0600)
		if v.Date != "" && otype == 0x0042 && pidx == 4 {
			vw.replaceDate(pn, v.Date)
		}
	}
}

func (vw *VoucherWriter) replaceSearchKey(pn int, v VoucherWriteData) {
	if v.Number == "" {
		return
	}
	page := vw.tranW.data[pn*PageSize : (pn+1)*PageSize]

	// Find TLV field 0x0002 that contains the \x05-separated composite key
	i := 18
	for i < 490 {
		if i+8 > PageSize || page[i] != 0x02 || page[i+1] != 0x10 {
			i++
			continue
		}
		fid := binary.LittleEndian.Uint16(page[i+2 : i+4])
		if fid != 0x0002 || page[i+4] != 0x00 || page[i+5] != 0x0f {
			i++
			continue
		}
		slen := int(binary.LittleEndian.Uint16(page[i+6 : i+8]))
		if slen <= 0 || i+8+slen > PageSize {
			i++
			continue
		}

		// Decode the string
		existing := decodeUTF16(page[i+8 : i+8+slen])
		parts := splitOnByte(existing, 0x05)
		if len(parts) < 4 {
			i += 8 + slen
			continue
		}

		// This is the composite key: Year\x05TypeSeq\x05TypeName\x05Number
		oldNumber := parts[3]
		if len(v.Number) <= len(oldNumber) {
			// Replace the number portion in-place
			newKey := parts[0] + "\x05" + parts[1] + "\x05" + parts[2] + "\x05" + v.Number
			// Pad with spaces if shorter
			for len(newKey) < len(existing) {
				newKey += " "
			}
			newKey = newKey[:len(existing)]
			newU16 := encodeUTF16LE(newKey)
			if len(newU16) <= slen {
				copy(page[i+8:], newU16)
			}
		}
		return
	}
}

func (vw *VoucherWriter) replaceTLVField(pn int, targetFid uint16, newValue string) {
	page := vw.tranW.data[pn*PageSize : (pn+1)*PageSize]
	newU16 := encodeUTF16LE(newValue)
	i := 18
	for i < 500 {
		if i+8 <= PageSize && page[i] == 0x02 && page[i+1] == 0x10 {
			fid := binary.LittleEndian.Uint16(page[i+2 : i+4])
			if fid == targetFid && page[i+4] == 0x00 && page[i+5] == 0x0f {
				slen := int(binary.LittleEndian.Uint16(page[i+6 : i+8]))
				if slen > 0 && i+8+slen <= PageSize {
					padded := padName(page[i+8:i+8+slen], newU16)
					copy(page[i+8:], padded)
					return
				}
			}
			if page[i+4] == 0x00 && page[i+5] == 0x0f {
				slen := int(binary.LittleEndian.Uint16(page[i+6 : i+8]))
				if slen > 0 && i+8+slen <= PageSize {
					i += 8 + slen
					continue
				}
			}
		}
		i++
	}
}

func (vw *VoucherWriter) replaceDate(pn int, dateStr string) {
	// Parse DD-MM-YYYY
	t, err := time.Parse("02-01-2006", dateStr)
	if err != nil {
		return
	}
	serial := DateToExcelSerial(t)
	page := vw.tranW.data[pn*PageSize : (pn+1)*PageSize]

	// Scan for field 0x07D4 with type 0x0600 in 10-byte records
	for i := 48; i < 400; i += 10 {
		fid := binary.LittleEndian.Uint16(page[i : i+2])
		typ := binary.LittleEndian.Uint16(page[i+2 : i+4])
		if fid == 0x07D4 && typ == 0x0600 {
			binary.LittleEndian.PutUint16(page[i+4:i+6], serial)
			return
		}
		if fid == 0 && typ == 0 {
			break
		}
	}
}

func (vw *VoucherWriter) cloneLinkEntries(templateSeq, newSeq uint32) {
	// LinkMgr has its own seq space. For simplicity, we find pages
	// that reference the template voucher and clone them with new seq.
	// This is a simplified approach — full implementation would parse
	// the cross-reference structure.
	newLinkSeq := vw.linkW.maxSeq() + 1
	tmplPages := vw.findPagesBySeq(vw.linkW, templateSeq)
	if len(tmplPages) == 0 {
		return
	}

	startPage := vw.linkW.totalPages()
	for _, pn := range tmplPages {
		vw.linkW.data = append(vw.linkW.data, make([]byte, PageSize)...)
		newPn := vw.linkW.totalPages() - 1
		copy(vw.linkW.data[newPn*PageSize:], vw.linkW.data[pn*PageSize:(pn+1)*PageSize])
		binary.LittleEndian.PutUint32(vw.linkW.data[newPn*PageSize+4:], newLinkSeq)
		newLinkSeq++
	}

	// Update LinkMgr header
	binary.LittleEndian.PutUint32(vw.linkW.data[8:12], uint32(vw.linkW.totalPages()-1))
	binary.LittleEndian.PutUint32(vw.linkW.data[12:16], newLinkSeq-1)
	SetPageChecksum(vw.linkW.data[0:PageSize], 0)

	for pn := startPage; pn < vw.linkW.totalPages(); pn++ {
		SetPageChecksum(vw.linkW.data[pn*PageSize:(pn+1)*PageSize], pn)
	}
}

// --- Helpers ---

func splitOnByte(s string, sep byte) []string {
	var parts []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == sep {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	parts = append(parts, s[start:])
	return parts
}

// DateToExcelSerial converts a Go time.Time to Tally's Excel serial date.
// Excel serial = days since 30-Dec-1899 (with the Excel leap year bug).
func DateToExcelSerial(t time.Time) uint16 {
	epoch := time.Date(1899, 12, 30, 0, 0, 0, 0, time.UTC)
	days := int(t.Sub(epoch).Hours() / 24)
	return uint16(days)
}

// ExcelSerialToDate converts a Tally Excel serial date to time.Time.
func ExcelSerialToDate(serial uint16) time.Time {
	epoch := time.Date(1899, 12, 30, 0, 0, 0, 0, time.UTC)
	return epoch.AddDate(0, 0, int(serial))
}

// GenerateVoucherNumber creates a voucher number like "PREFIX/NNNN/YY-YY"
func GenerateVoucherNumber(prefix string, serial int, date time.Time) string {
	fy := date.Year()
	if date.Month() < 4 {
		fy--
	}
	return fmt.Sprintf("%s/%04d/%02d-%02d", prefix, serial, fy%100, (fy+1)%100)
}


