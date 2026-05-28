package tallydb

import (
	"encoding/binary"
	"os"
	"path/filepath"
	"testing"
)

func TestWriteLedger(t *testing.T) {
	// Try test data files
	type testCase struct {
		path, template, newName string
	}
	cases := []testCase{
		{"/tmp/100000_after.1800", "TEMPLATE1", "RUDRA YTW"},
		{"testdata/manager_frida_after.1800", "FRIDA TEST2", "KIRO BINAR!"},
	}
	var srcPath, templateName, newLedger string
	for _, tc := range cases {
		if _, err := os.Stat(tc.path); err == nil {
			srcPath, templateName, newLedger = tc.path, tc.template, tc.newName
			break
		}
	}
	if srcPath == "" {
		t.Skip("No test data file found")
	}

	// Copy to temp
	tmpDir := t.TempDir()
	tmpFile := filepath.Join(tmpDir, "Manager.1800")
	data, _ := os.ReadFile(srcPath)
	os.WriteFile(tmpFile, data, 0644)

	origPages := len(data) / PageSize

	// Write a new ledger cloning TEMPLATE1
	w, err := OpenWriter(tmpFile)
	if err != nil {
		t.Fatal(err)
	}

	seq, err := w.WriteLedger(templateName, newLedger)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("Written ledger seq=%d", seq)

	if err := w.Save(); err != nil {
		t.Fatal(err)
	}

	// Verify
	newData, _ := os.ReadFile(tmpFile)
	newPages := len(newData) / PageSize

	if newPages != origPages+2 {
		t.Errorf("Expected %d pages, got %d", origPages+2, newPages)
	}

	// Verify checksums on new pages
	for pn := origPages; pn < newPages; pn++ {
		page := newData[pn*PageSize : (pn+1)*PageSize]
		if !ValidatePage(page, pn) {
			t.Errorf("Page %d has invalid checksum", pn)
		}
	}

	// Verify page 0 checksum
	if !ValidatePage(newData[0:PageSize], 0) {
		t.Error("Page 0 has invalid checksum")
	}

	// Verify header updated
	maxSeq := binary.LittleEndian.Uint32(newData[12:16])
	if maxSeq != seq {
		t.Errorf("Header maxSeq=%d, want %d", maxSeq, seq)
	}

	// Verify name appears in file
	nameBytes := encodeUTF16LE(newLedger)
	found := false
	for pn := origPages; pn < newPages; pn++ {
		page := newData[pn*PageSize : (pn+1)*PageSize]
		for i := 0; i < PageSize-len(nameBytes); i++ {
			match := true
			for j := range nameBytes {
				if page[i+j] != nameBytes[j] {
					match = false
					break
				}
			}
			if match {
				found = true
				break
			}
		}
		if found {
			break
		}
	}
	if !found {
		t.Error("New ledger name not found in written pages")
	}

	t.Logf("SUCCESS: %d pages, seq=%d, name found", newPages, seq)
}

func TestWriteLedgerNameMismatch(t *testing.T) {
	srcPath := "/tmp/100000_after.1800"
	if _, err := os.Stat(srcPath); err != nil {
		t.Skip("No test data")
	}

	tmpDir := t.TempDir()
	tmpFile := filepath.Join(tmpDir, "Manager.1800")
	data, _ := os.ReadFile(srcPath)
	os.WriteFile(tmpFile, data, 0644)

	w, _ := OpenWriter(tmpFile)

	// Short name should work now (padded with spaces)
	seq, err := w.WriteLedger("TEMPLATE1", "HI")
	if err != nil {
		t.Errorf("Short name should work (padded): %v", err)
	} else {
		t.Logf("Short name OK: seq=%d", seq)
	}

	// Long name should work (truncated)
	seq, err = w.WriteLedger("TEMPLATE1", "VERY LONG NAME HERE")
	if err != nil {
		t.Errorf("Long name should work (truncated): %v", err)
	} else {
		t.Logf("Long name OK: seq=%d", seq)
	}
}
