package tallydb

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"os"
	"unicode/utf16"
)

// Writer handles appending new masters to .1800 files.
type Writer struct {
	path string
	data []byte
}

// OpenWriter opens a .1800 file for read-write operations.
func OpenWriter(path string) (*Writer, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	if len(data) < PageSize*2 || len(data)%PageSize != 0 {
		return nil, fmt.Errorf("invalid .1800 file: %s", path)
	}
	return &Writer{path: path, data: data}, nil
}

func (w *Writer) totalPages() int { return len(w.data) / PageSize }
func (w *Writer) maxSeq() uint32  { return binary.LittleEndian.Uint32(w.data[12:16]) }

// Save writes the modified data back to disk.
func (w *Writer) Save() error { return os.WriteFile(w.path, w.data, 0644) }

// DeleteIndexFiles removes files that Tally rebuilds on next open.
func DeleteIndexFiles(companyDir string) {
	for _, f := range []string{"Index.1800", "TSTATE.TSF", "TUPDATE.TSF"} {
		os.Remove(companyDir + "/" + f)
	}
}

// --- Internal helpers ---

// findTemplatePages finds pidx=2 by name, then pidx=0 by matching seq.
func (w *Writer) findTemplatePages(nameU16 []byte) (pidx2, pidx0 int) {
	pidx2, pidx0 = -1, -1
	total := w.totalPages()

	for pn := 1; pn < total; pn++ {
		page := w.data[pn*PageSize : (pn+1)*PageSize]
		if !bytes.Contains(page, nameU16) {
			continue
		}
		otype := binary.LittleEndian.Uint16(page[16:18])
		pidx := binary.LittleEndian.Uint32(page[8:12])
		if otype == 0x000B && pidx == 2 {
			pidx2 = pn
			break
		}
	}
	if pidx2 < 0 {
		return
	}

	targetSeq := binary.LittleEndian.Uint32(w.data[pidx2*PageSize+4 : pidx2*PageSize+8])
	for pn := 1; pn < total; pn++ {
		page := w.data[pn*PageSize : (pn+1)*PageSize]
		seq := binary.LittleEndian.Uint32(page[4:8])
		otype := binary.LittleEndian.Uint16(page[16:18])
		pidx := binary.LittleEndian.Uint32(page[8:12])
		if otype == 0x000B && pidx == 0 && seq == targetSeq {
			pidx0 = pn
			break
		}
	}
	return
}

// findAnyLedger checks if any user-created ledger exists.
func (w *Writer) findAnyLedger() int {
	total := w.totalPages()
	for pn := total - 1; pn > 0; pn-- {
		page := w.data[pn*PageSize : (pn+1)*PageSize]
		otype := binary.LittleEndian.Uint16(page[16:18])
		pidx := binary.LittleEndian.Uint32(page[8:12])
		if otype == 0x000B && pidx == 2 {
			if bytes.Contains(page, []byte{0x02, 0x10, 0x02, 0x00}) {
				return pn
			}
		}
	}
	return -1
}

// findChainTail finds the last pidx=2, type=0x000B page where [62]=0.
func (w *Writer) findChainTail(skipPage int) int {
	total := w.totalPages()
	for pn := total - 1; pn > 0; pn-- {
		if pn == skipPage {
			continue
		}
		page := w.data[pn*PageSize : (pn+1)*PageSize]
		otype := binary.LittleEndian.Uint16(page[16:18])
		pidx := binary.LittleEndian.Uint32(page[8:12])
		if otype == 0x000B && pidx == 2 {
			if binary.LittleEndian.Uint16(page[62:64]) == 0 {
				return pn
			}
		}
	}
	return -1
}

// incrementCounters increments [34] on group-level 0x0042 pages.
func (w *Writer) incrementCounters() {
	total := w.totalPages()
	for pn := total / 2; pn < total; pn++ {
		page := w.data[pn*PageSize : (pn+1)*PageSize]
		otype := binary.LittleEndian.Uint16(page[16:18])
		if otype != 0x0042 {
			continue
		}
		seq := binary.LittleEndian.Uint32(page[4:8])
		val34 := page[34]
		if seq < 100 && val34 > 0 && val34 < 50 {
			page[34]++
			val44 := binary.LittleEndian.Uint32(page[44:48])
			if val44 > 0 && val44 < 50 {
				binary.LittleEndian.PutUint32(page[44:48], val44+1)
			}
			SetPageChecksum(w.data[pn*PageSize:(pn+1)*PageSize], pn)
		}
	}
}

func (w *Writer) replaceName(pn int, oldU16, newU16 []byte) {
	page := w.data[pn*PageSize : (pn+1)*PageSize]
	for {
		idx := bytes.Index(page, oldU16)
		if idx < 0 {
			break
		}
		copy(page[idx:], newU16)
	}
}

func (w *Writer) replaceSeqRefs(pn int, oldSeq, newSeq uint32) {
	off := pn*PageSize + 8
	end := (pn + 1) * PageSize - 3
	for i := off; i < end; i += 2 {
		if binary.LittleEndian.Uint32(w.data[i:i+4]) == oldSeq {
			binary.LittleEndian.PutUint32(w.data[i:i+4], newSeq)
		}
	}
}

// padName adjusts newU16 to match oldU16 length (pad with spaces or truncate).
func padName(oldU16, newU16 []byte) []byte {
	if len(newU16) < len(oldU16) {
		padded := make([]byte, len(oldU16))
		copy(padded, newU16[:len(newU16)-2])
		for i := len(newU16) - 2; i < len(oldU16)-2; i += 2 {
			padded[i] = 0x20
			padded[i+1] = 0x00
		}
		padded[len(oldU16)-2] = 0x00
		padded[len(oldU16)-1] = 0x00
		return padded
	}
	if len(newU16) > len(oldU16) {
		result := make([]byte, len(oldU16))
		copy(result, newU16[:len(oldU16)-2])
		result[len(oldU16)-2] = 0x00
		result[len(oldU16)-1] = 0x00
		return result
	}
	return newU16
}

func encodeUTF16LE(s string) []byte {
	runes := utf16.Encode([]rune(s))
	runes = append(runes, 0)
	buf := make([]byte, len(runes)*2)
	for i, r := range runes {
		binary.LittleEndian.PutUint16(buf[i*2:], r)
	}
	return buf
}
