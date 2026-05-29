// Package tallydb reads TallyPrime .1800 binary database files directly.
// No Tally server needed — reads company data from the raw files on disk.
package tallydb

import (
	"encoding/binary"
	"fmt"
	"os"
	"unicode/utf16"
)

const PageSize = 512

// FileHeader is the first page (page 0) of a .1800 file.
type FileHeader struct {
	Magic      uint32
	Reserved   uint32
	TotalPages uint32
	MaxID      uint32
}

// PageHeader is the header of each data page.
type PageHeader struct {
	Checksum  uint32
	SeqNum    uint32
	PageIdx   uint32
	Flags     uint32
	ObjType   uint16
	ParentSeq uint32 // bytes 28-31: parent group seq (for ledger pidx=4 pages)
}

// Field is a decoded field from a page.
type Field struct {
	ID    uint16
	Type  byte // 'S' = string, 'I' = int32, 'L' = int64, 'D' = date (days since 1900)
	Str   string
	Int32 int32
	Int64 int64
}

// Page is a decoded page with all its fields.
type Page struct {
	Header PageHeader
	Fields []Field
	Offset int64
}

// ReadFile reads a .1800 file and returns all decoded pages.
func ReadFile(path string) ([]Page, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", path, err)
	}
	if len(data) < PageSize*2 {
		return nil, fmt.Errorf("%s too small", path)
	}
	return ParsePages(data), nil
}

// ParsePages parses all data pages from raw .1800 file bytes.
func ParsePages(data []byte) []Page {
	numPages := len(data) / PageSize
	pages := make([]Page, 0, numPages)

	for i := 1; i < numPages; i++ { // skip page 0 (file header)
		offset := i * PageSize
		pageData := data[offset : offset+PageSize]

		// Skip empty pages
		if isZeroPage(pageData) {
			continue
		}

		page := Page{Offset: int64(offset)}
		page.Header = PageHeader{
			Checksum:  binary.LittleEndian.Uint32(pageData[0:4]),
			SeqNum:    binary.LittleEndian.Uint32(pageData[4:8]),
			PageIdx:   binary.LittleEndian.Uint32(pageData[8:12]),
			Flags:     binary.LittleEndian.Uint32(pageData[12:16]),
			ObjType:   binary.LittleEndian.Uint16(pageData[16:18]),
			ParentSeq: binary.LittleEndian.Uint32(pageData[28:32]),
		}
		page.Fields = decodeFields(pageData)
		if len(page.Fields) > 0 {
			pages = append(pages, page)
		}
	}
	return pages
}

// decodeFields extracts all fields from a page's data area.
func decodeFields(page []byte) []Field {
	var fields []Field
	i := 0

	for i < len(page)-6 {
		// String field: 02 10 [fid LE16] 00 0f [byte_len LE16] [UTF16LE data]
		if i+8 <= len(page) && page[i] == 0x02 && page[i+1] == 0x10 {
			fid := binary.LittleEndian.Uint16(page[i+2 : i+4])
			if page[i+4] == 0x00 && page[i+5] == 0x0f {
				strLen := int(binary.LittleEndian.Uint16(page[i+6 : i+8]))
				if strLen >= 2 && strLen <= 500 && i+8+strLen <= len(page) {
					s := decodeUTF16(page[i+8 : i+8+strLen])
					if s != "" {
						fields = append(fields, Field{ID: fid, Type: 'S', Str: s})
					}
					i += 8 + strLen
					continue
				}
			}
			i += 2
			continue
		}

		// 8-byte amount field: [fid LE16] 00 08 [value LE64]
		if i+12 <= len(page) {
			fid := binary.LittleEndian.Uint16(page[i : i+2])
			if fid > 0 && fid < 0x5000 && page[i+2] == 0x00 && page[i+3] == 0x08 {
				val := int64(binary.LittleEndian.Uint64(page[i+4 : i+12]))
				if val != 0 {
					fields = append(fields, Field{ID: fid, Type: 'L', Int64: val})
				}
				i += 12
				continue
			}
			// Type 0x09: same as 0x08 (int64 amount, divisor 100000) — used for opening balances
			if fid > 0 && fid < 0x5000 && page[i+2] == 0x00 && page[i+3] == 0x09 {
				val := int64(binary.LittleEndian.Uint64(page[i+4 : i+12]))
				if val != 0 {
					fields = append(fields, Field{ID: fid, Type: 'L', Int64: val})
				}
				i += 12
				continue
			}
		}

		// 4-byte numeric field: [fid LE16] 00 06 [value LE32]
		if i+8 <= len(page) {
			fid := binary.LittleEndian.Uint16(page[i : i+2])
			if fid > 0 && fid < 0x5000 && page[i+2] == 0x00 && page[i+3] == 0x06 {
				val := int32(binary.LittleEndian.Uint32(page[i+4 : i+8]))
				if val != 0 {
					fields = append(fields, Field{ID: fid, Type: 'I', Int32: val})
				}
				i += 8
				continue
			}
			// Date field: [fid LE16] 00 0D [days LE32] (days since 1900-01-01)
			if fid > 0 && fid < 0x5000 && page[i+2] == 0x00 && page[i+3] == 0x0D {
				val := int32(binary.LittleEndian.Uint32(page[i+4 : i+8]))
				if val > 40000 && val < 55000 { // reasonable date range 2009-2050
					fields = append(fields, Field{ID: fid, Type: 'D', Int32: val})
				}
				i += 8
				continue
			}
			// Type 0x07: amount(4) + date(2) compound field (in LinkMgr)
			if fid > 0 && fid < 0x5000 && page[i+2] == 0x00 && page[i+3] == 0x07 && i+10 <= len(page) {
				amt := int32(binary.LittleEndian.Uint32(page[i+4 : i+8]))
				dateVal := int32(binary.LittleEndian.Uint16(page[i+8 : i+10]))
				if dateVal > 40000 && dateVal < 55000 {
					fields = append(fields, Field{ID: fid, Type: 'D', Int32: dateVal})
				}
				if amt != 0 {
					fields = append(fields, Field{ID: fid, Type: 'L', Int64: int64(amt) * 100000})
				}
				i += 10
				continue
			}
		}

		i++
	}
	return fields
}

func decodeUTF16(b []byte) string {
	if len(b) < 2 {
		return ""
	}
	// Decode UTF-16LE
	u16 := make([]uint16, len(b)/2)
	for i := 0; i < len(u16); i++ {
		u16[i] = binary.LittleEndian.Uint16(b[i*2 : i*2+2])
	}
	// Trim null terminators
	for len(u16) > 0 && u16[len(u16)-1] == 0 {
		u16 = u16[:len(u16)-1]
	}
	if len(u16) == 0 {
		return ""
	}
	runes := utf16.Decode(u16)
	// Check printable
	for _, r := range runes {
		if r < 32 && r != '\t' && r != '\n' && r != '\r' {
			return ""
		}
	}
	return string(runes)
}

func isZeroPage(p []byte) bool {
	for _, b := range p[4:64] { // skip first 4 (could be checksum)
		if b != 0 {
			return false
		}
	}
	return true
}
