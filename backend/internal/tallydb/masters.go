package tallydb

import (
	"fmt"
	"strings"
	"time"
)

// Group is a Tally account group.
type Group struct {
	Name   string `json:"name"`
	Parent string `json:"parent"`
	GUID   string `json:"guid,omitempty"`
}

// Ledger is a Tally ledger account.
type Ledger struct {
	Name         string   `json:"name"`
	Parent       string   `json:"parent,omitempty"`
	Address      []string `json:"address,omitempty"`
	Email        string   `json:"email,omitempty"`
	Phone        string   `json:"phone,omitempty"`
	Contact      string   `json:"contact,omitempty"`
	PAN          string   `json:"pan,omitempty"`
	GSTIN        string   `json:"gstin,omitempty"`
	State        string   `json:"state,omitempty"`
	Pincode      string   `json:"pincode,omitempty"`
	DealerType   string   `json:"dealer_type,omitempty"`
	BankAcc      string   `json:"bank_account,omitempty"`
	Country      string   `json:"country,omitempty"`
	PriceList    string   `json:"price_list,omitempty"`
	CreditPeriod string   `json:"credit_period,omitempty"`
	OpeningBal   int64    `json:"opening_balance,omitempty"`
	CreatedDate  string   `json:"created_date,omitempty"`
	LastVchDate  string   `json:"last_voucher_date,omitempty"`
}

// StockItem is a Tally stock/inventory item.
type StockItem struct {
	Name     string `json:"name"`
	Parent   string `json:"parent,omitempty"`
	HSN      string `json:"hsn_code,omitempty"`
	Unit     string `json:"base_units,omitempty"`
	BaseUnit string `json:"unit,omitempty"`
}

// Masters holds all master data from Manager.1800.
type Masters struct {
	Groups     []Group     `json:"groups"`
	Ledgers    []Ledger    `json:"ledgers"`
	StockItems []StockItem `json:"stock_items"`
	Units      []Unit      `json:"units"`
}

// Unit is a measurement unit (PCS, KG, LTR etc.)
type Unit struct {
	Name   string `json:"name"`
	Symbol string `json:"symbol,omitempty"`
}

// ParseMasters reads Manager.1800/.900 and extracts all master records.
func ParseMasters(dataDir string) (*Masters, error) {
	path := ResolveFile(dataDir, "Manager")
	if path == "" {
		return nil, fmt.Errorf("Manager.1800/.900 not found in %s", dataDir)
	}
	pages, err := ReadFile(path)
	if err != nil {
		return nil, err
	}

	m := &Masters{}
	seenGroups := make(map[string]bool)
	seenUnits := make(map[string]bool)

	// First pass: collect ledger names by seq (from pidx=2 pages)
	ledgerSeqs := make(map[uint32]int) // seq -> index in m.Ledgers
	for _, page := range pages {
		fields := page.Fields
		if !hasField(fields, FldLedgerName) {
			continue
		}
		name := getFieldStr(fields, FldLedgerName)
		if hasField(fields, 0x1132) || hasField(fields, 0x0FD4) {
			if name != "" && !seenUnits[name] {
				seenUnits[name] = true
				m.Units = append(m.Units, Unit{Name: name, Symbol: name})
			}
			continue
		}
		if isVoucherTypeName(name) || isCurrencyName(name) {
			continue
		}
		l := parseLedger(fields)
		ledgerSeqs[page.Header.SeqNum] = len(m.Ledgers)
		m.Ledgers = append(m.Ledgers, l)
	}

	// Second pass: enrich ledgers from pidx=0 pages (contact/tax details)
	for _, page := range pages {
		if page.Header.ObjType != 0x000B && page.Header.ObjType != 0x0000 {
			continue
		}
		idx, ok := ledgerSeqs[page.Header.SeqNum]
		if !ok {
			continue
		}
		l := &m.Ledgers[idx]
		for _, f := range page.Fields {
			if f.Type != 'S' {
				continue
			}
			switch f.ID {
			case 0x0A91:
				if l.Phone == "" { l.Phone = f.Str }
			case 0x0A93:
				if l.Contact == "" { l.Contact = f.Str }
			case 0x0A94:
				if l.Pincode == "" { l.Pincode = f.Str }
			case 0x0AC1:
				if l.PAN == "" { l.PAN = f.Str }
			case 0x0ACA:
				if l.GSTIN == "" && len(f.Str) == 15 { l.GSTIN = f.Str }
			case 0x0ACC:
				if l.State == "" { l.State = f.Str }
			case 0x0ACE:
				if l.DealerType == "" { l.DealerType = f.Str }
			case 0x0AC4:
				if l.BankAcc == "" { l.BankAcc = f.Str }
			case 0x0A31:
				if l.Country == "" { l.Country = f.Str }
			case 0x0A90:
				if l.Email == "" { l.Email = f.Str }
			case 0x0003: // address line 1
				if len(f.Str) > 3 && len(l.Address) < 4 {
					l.Address = append(l.Address, f.Str)
				}
			case 0x0006: // address line 2
				if len(f.Str) > 3 && len(l.Address) < 4 {
					l.Address = append(l.Address, f.Str)
				}
			case 0x0005: // pincode (from pidx=0)
				if l.Pincode == "" && len(f.Str) == 6 { l.Pincode = f.Str }
			case 0x0A2D: // price list
				if l.PriceList == "" { l.PriceList = f.Str }
			case 0x0BBB: // credit period
				if l.CreditPeriod == "" { l.CreditPeriod = f.Str }
			}
		}
		// Numeric fields
		for _, f := range page.Fields {
			if f.Type == 'I' && f.ID == 0x01F8 && l.OpeningBal == 0 {
				l.OpeningBal = int64(f.Int32)
			}
			if f.Type == 'D' {
				days := int(f.Int32) - 2
				t := time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, days)
				ds := t.Format("02-01-2006")
				switch f.ID {
				case 0x0067:
					if l.CreatedDate == "" { l.CreatedDate = ds }
				case 0x0A2B:
					if l.LastVchDate == "" { l.LastVchDate = ds }
				}
			}
		}
	}

	// Third pass: groups from pidx=2 pages without ledger name
	for _, page := range pages {
		ot := page.Header.ObjType
		if (ot == 0x000B || ot == 0x0000) && page.Header.PageIdx == 2 && !hasField(page.Fields, FldLedgerName) && hasField(page.Fields, FldName) {
			g := parseGroup(page.Fields)
			if g.Name != "" && !seenGroups[g.Name] {
				seenGroups[g.Name] = true
				m.Groups = append(m.Groups, g)
			}
		}
	}

	m.StockItems = extractStockItems(dataDir)

	return m, nil
}

func isVoucherTypeName(name string) bool {
	short := []string{"INR", "Ctra", "Pymt", "Rcpt", "Jrnl", "C/Note", "D/Note", "Sale", "Purc", "Dely Note", "Rej In", "Rej Out", "Memo", "Phys Stock"}
	for _, s := range short {
		if name == s {
			return true
		}
	}
	return false
}

func isCurrencyName(name string) bool {
	currencies := []string{"INR", "USD", "EUR", "GBP", "Pound", "Singapore Dollar"}
	for _, c := range currencies {
		if name == c {
			return true
		}
	}
	return false
}

// extractStockItems gets unique stock items from voucher line items.
func extractStockItems(dataDir string) []StockItem {
	path := ResolveFile(dataDir, "TranMgr")
	if path == "" {
		return nil
	}
	pages, err := ReadFile(path)
	if err != nil {
		return nil
	}

	seen := make(map[string]bool)
	var items []StockItem
	for _, page := range pages {
		if !isVoucherItemPage(page.Fields) {
			continue
		}
		for _, f := range page.Fields {
			if f.Type == 'S' && f.ID == 0x0001 && f.Str != "" && !seen[f.Str] {
				seen[f.Str] = true
				item := StockItem{Name: f.Str}
				// Get HSN from same page
				for _, f2 := range page.Fields {
					if f2.Type == 'S' && f2.ID == 0x0003 && len(f2.Str) >= 4 && len(f2.Str) <= 10 {
						item.HSN = f2.Str
						break
					}
					if f2.Type == 'S' && f2.ID == 0x0004 && len(f2.Str) <= 10 {
						item.Unit = f2.Str
					}
				}
				items = append(items, item)
			}
		}
	}
	return items
}

func getFieldStr(fields []Field, id uint16) string {
	for _, f := range fields {
		if f.ID == id && f.Type == 'S' {
			return f.Str
		}
	}
	return ""
}

func parseGroup(fields []Field) Group {
	g := Group{}
	for _, f := range fields {
		if f.Type != 'S' {
			continue
		}
		switch f.ID {
		case FldName:
			if g.Name == "" {
				g.Name = f.Str
			} else if g.Parent == "" {
				g.Parent = f.Str
			}
		case FldGUID:
			g.GUID = f.Str
		}
	}
	return g
}

func parseLedger(fields []Field) Ledger {
	l := Ledger{}
	for _, f := range fields {
		if f.Type != 'S' {
			continue
		}
		switch f.ID {
		case FldLedgerName: // 0x01F7
			if l.Name == "" { l.Name = f.Str }
		case 0x0002: // parent group name
			if l.Parent == "" && l.Name != "" && !strings.EqualFold(f.Str, l.Name) {
				l.Parent = f.Str
			}
		case FldLedgerAddr: // 0x01F8
			l.Address = append(l.Address, f.Str)
		case 0x0A91: // Phone
			if l.Phone == "" { l.Phone = f.Str }
		case 0x0A93: // Contact person
			if l.Contact == "" { l.Contact = f.Str }
		case 0x0A94: // Pincode
			if l.Pincode == "" { l.Pincode = f.Str }
		case 0x0AC1: // PAN
			if l.PAN == "" { l.PAN = f.Str }
		case 0x0ACA: // GSTIN
			if l.GSTIN == "" && len(f.Str) == 15 { l.GSTIN = f.Str }
		case 0x0ACC: // State
			if l.State == "" { l.State = f.Str }
		case 0x0ACE: // Dealer type
			if l.DealerType == "" { l.DealerType = f.Str }
		case 0x0AC4: // Bank account
			if l.BankAcc == "" { l.BankAcc = f.Str }
		case 0x0A31: // Country
			if l.Country == "" { l.Country = f.Str }
		case FldEmail: // 0x0A90
			if l.Email == "" { l.Email = f.Str }
		}
	}
	return l
}

func hasField(fields []Field, id uint16) bool {
	for _, f := range fields {
		if f.ID == id {
			return true
		}
	}
	return false
}
