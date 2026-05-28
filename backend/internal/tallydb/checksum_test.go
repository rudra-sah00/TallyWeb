package tallydb

import (
	"encoding/binary"
	"os"
	"testing"
)

func TestPageChecksum(t *testing.T) {
	// Test with known values from reverse engineering
	// Page with all-zero content should produce checksum 0 when page_number=0
	zeroPage := make([]byte, 512)
	if got := PageChecksum(zeroPage, 0); got != 0 {
		t.Errorf("PageChecksum(zeros, 0) = 0x%08x, want 0", got)
	}

	// Verify CRC table entry[1] = 0x1021 (CRC-CCITT polynomial)
	if crcTable[1] != 0x1021 {
		t.Errorf("crcTable[1] = 0x%04x, want 0x1021", crcTable[1])
	}
}

func TestPageChecksumWithFile(t *testing.T) {
	// Try to load a real Manager.1800 file for verification
	paths := []string{
		"../../../Tally-Latest Data/Tally-Data/Data_22-05-26E/020013/Manager.1800",
		"/tmp/020013_fresh/Manager.1800",
	}

	var data []byte
	for _, p := range paths {
		var err error
		data, err = os.ReadFile(p)
		if err == nil {
			break
		}
	}
	if data == nil {
		t.Skip("No test data file found")
	}

	totalPages := len(data) / PageSize
	verified := 0
	failed := 0

	for pn := 1; pn < totalPages; pn++ {
		page := data[pn*PageSize : (pn+1)*PageSize]
		stored := binary.LittleEndian.Uint32(page[:4])
		if stored == 0 {
			continue
		}
		if ValidatePage(page, pn) {
			verified++
		} else {
			failed++
			if failed <= 3 {
				computed := PageChecksum(page, pn)
				t.Errorf("Page %d: stored=0x%08x computed=0x%08x", pn, stored, computed)
			}
		}
	}

	if failed > 0 {
		t.Errorf("%d/%d pages failed checksum validation", failed, verified+failed)
	} else {
		t.Logf("All %d pages verified successfully", verified)
	}
}

func TestSetPageChecksum(t *testing.T) {
	page := make([]byte, 512)
	page[4] = 0x01 // some content
	page[8] = 0x42

	SetPageChecksum(page, 5)
	if !ValidatePage(page, 5) {
		t.Error("SetPageChecksum produced invalid checksum")
	}
}
