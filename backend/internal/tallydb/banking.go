package tallydb

import (
	"fmt"
	"time"
)

// BankEntry is a transaction from LinkMgr.1800.
type BankEntry struct {
	Bank        string  `json:"bank"`
	Branch      string  `json:"branch,omitempty"`
	AccountNo   string  `json:"account_no,omitempty"`
	IFSC        string  `json:"ifsc,omitempty"`
	PaymentMode string  `json:"payment_mode,omitempty"`
	VoucherID   string  `json:"voucher_id,omitempty"`
	Amount      float64 `json:"amount,omitempty"`
	Date        string  `json:"date,omitempty"`
	Payee       string  `json:"payee,omitempty"`
	ChequeRange string  `json:"cheque_range,omitempty"`
	TxnType     string  `json:"txn_type,omitempty"`
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
		ot := page.Header.ObjType
		if ot != 0x0054 && ot != 0x006F && ot != 0x0030 {
			continue
		}

		var e BankEntry
		hasBank := false
		for _, f := range page.Fields {
			switch {
			case f.Type == 'S' && f.ID == 0x2331:
				e.Bank = f.Str; hasBank = true
			case f.Type == 'S' && f.ID == 0x2332:
				e.Branch = f.Str
			case f.Type == 'S' && f.ID == 0x2333:
				e.AccountNo = f.Str
			case f.Type == 'S' && f.ID == 0x233F:
				e.IFSC = f.Str
			case f.Type == 'S' && f.ID == 0x2346:
				e.PaymentMode = f.Str
			case f.Type == 'S' && f.ID == 0x2358:
				e.TxnType = f.Str
			case f.Type == 'S' && f.ID == 0x235B:
				e.VoucherID = f.Str
			case f.Type == 'S' && f.ID == 0x232C:
				e.ChequeRange = f.Str
			case f.Type == 'S' && f.ID == 0x232E && e.Payee == "":
				e.Payee = f.Str
			case f.Type == 'L' && f.ID == 0x0002 && e.Amount == 0:
				amt := float64(f.Int64) / 100000.0
				if amt > 100 { e.Amount = amt }
			}
		}
		for _, f := range page.Fields {
			if f.Type == 'D' && e.Date == "" {
				days := int(f.Int32) - 2
				t := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, days)
				e.Date = t.Format("02-01-2006")
			}
		}
		if hasBank || e.Payee != "" {
			entries = append(entries, e)
		}
	}
	return entries, nil
}
