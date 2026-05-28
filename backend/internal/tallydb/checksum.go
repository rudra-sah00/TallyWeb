package tallydb

// Tally page checksum: dual CRC-16/CCITT (polynomial 0x1021)
// with the page number as the initial seed for both CRCs.
// CRC1 processes even-indexed bytes, CRC2 processes odd-indexed bytes
// from the 508-byte content (skipping the 4-byte checksum field).
// Result = (CRC1 << 16) + CRC2

var crcTable [256]uint16

func init() {
	for i := 0; i < 256; i++ {
		crc := uint16(i) << 8
		for j := 0; j < 8; j++ {
			if crc&0x8000 != 0 {
				crc = (crc << 1) ^ 0x1021
			} else {
				crc <<= 1
			}
		}
		crcTable[i] = crc
	}
}

// PageChecksum computes the checksum for a 512-byte page.
// pageData must be exactly 512 bytes. pageNumber is the 0-based page index.
func PageChecksum(pageData []byte, pageNumber int) uint32 {
	content := pageData[4:] // skip 4-byte checksum field
	seed := uint16(pageNumber & 0xFFFF)
	crc1 := seed
	crc2 := seed
	for i := 0; i < len(content)-1; i += 2 {
		crc1 = (crc1 << 8) ^ crcTable[byte(crc1>>8)^content[i]]
		crc2 = (crc2 << 8) ^ crcTable[byte(crc2>>8)^content[i+1]]
	}
	return (uint32(crc1) << 16) + uint32(crc2)
}

// ValidatePage checks if a page's stored checksum matches the computed one.
func ValidatePage(pageData []byte, pageNumber int) bool {
	stored := uint32(pageData[0]) | uint32(pageData[1])<<8 | uint32(pageData[2])<<16 | uint32(pageData[3])<<24
	return stored == PageChecksum(pageData, pageNumber)
}

// SetPageChecksum computes and writes the correct checksum into the page.
func SetPageChecksum(pageData []byte, pageNumber int) {
	chk := PageChecksum(pageData, pageNumber)
	pageData[0] = byte(chk)
	pageData[1] = byte(chk >> 8)
	pageData[2] = byte(chk >> 16)
	pageData[3] = byte(chk >> 24)
}
