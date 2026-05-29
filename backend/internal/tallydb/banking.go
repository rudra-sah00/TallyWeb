package tallydb

import (
	"fmt"
	"time"
)

// BankEntry is a transaction from LinkMgr.1800.
type BankEntry struct {
	Bank        string `json:"bank"`
	Branch      string `json:"branch,omitempty"`
	AccountNo   string `json:"account_no,omitempty"`
	IFSC        string `json:"ifsc,omitempty"`
	PaymentMode string `json:"payment_mode,omitempty"`
	VoucherID   string `json:"voucher_id,omitempty"`
	Amount      int64  `json:"amount,omitempty"`
	Date        string `json:"date,omitempty"`
}

// ParseBankEntries reads LinkMgr.1800 for banking data.
func ParseBankEntries(dataDir string) ([]BankEntry, error) {
	path := ResolveFile(dataDir, "LinkMgr")
	if path == "" {
		return nil, fmt.Errorf("LinkMgr.1800 not found")
	}
	pages, err := ReadFile(path)
	if err != nil {
		return nil, err
	}

	var entries []BankEntry
	for _, page := range pages {
		// Only type=0x0054 and 0x006F have TLV bank data
		ot := page.Header.ObjType
		if ot != 0x0054 && ot != 0x006F {
			continue
		}

		var e BankEntry
		hasBank := false
		for _, f := range page.Fields {
			switch {
			case f.Type == 'S' && f.ID == 0x2331:
				e.Bank = f.Str
				hasBank = true
			case f.Type == 'S' && f.ID == 0x2332:
				e.Branch = f.Str
			case f.Type == 'S' && f.ID == 0x2333:
				e.AccountNo = f.Str
			case f.Type == 'S' && f.ID == 0x233F:
				e.IFSC = f.Str
			case f.Type == 'S' && f.ID == 0x2346:
				e.PaymentMode = f.Str
			case f.Type == 'S' && f.ID == 0x235B:
				e.VoucherID = f.Str
			}
		}
		// Extract amount+date from type 0x07 fields
		// In LinkMgr, the raw page bytes have: fid(2) 00 07 amount(4) date(2)
		// Our reader sees these as 'I' type with ID at various offsets
		// For now, use any date field found
		for _, f := range page.Fields {
			if f.Type == 'D' && e.Date == "" {
				days := int(f.Int32) - 2
				t := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, days)
				e.Date = t.Format("02-01-2006")
			}
		}

		if hasBank {
			entries = append(entries, e)
		}
	}
	return entries, nil
}
