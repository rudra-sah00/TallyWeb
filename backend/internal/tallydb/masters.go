package tallydb

import (
	"fmt"
	"strings"
)

// Group is a Tally account group.
type Group struct {
	Name   string `json:"name"`
	Parent string `json:"parent"`
	GUID   string `json:"guid,omitempty"`
}

// Ledger is a Tally ledger account.
type Ledger struct {
	Name    string   `json:"name"`
	Parent  string   `json:"parent"`
	GUID    string   `json:"guid,omitempty"`
	Address []string `json:"address,omitempty"`
	Email   string   `json:"email,omitempty"`
	Phone   string   `json:"phone,omitempty"`
	Contact string   `json:"contact,omitempty"`
	PAN     string   `json:"pan,omitempty"`
	GSTIN   string   `json:"gstin,omitempty"`
	State   string   `json:"state,omitempty"`
	Pincode string   `json:"pincode,omitempty"`
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
	for _, page := range pages {
		fields := page.Fields

		if hasField(fields, FldLedgerName) {
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

			m.Ledgers = append(m.Ledgers, parseLedger(fields))
		} else if page.Header.ObjType == 0x000B && page.Header.PageIdx == 2 && hasField(fields, FldName) {
			g := parseGroup(fields)
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
		case FldLedgerName:
			if l.Name == "" {
				l.Name = f.Str
			}
		case FldLedgerAddr:
			l.Address = append(l.Address, f.Str)
		case FldEmail:
			l.Email = f.Str
		case FldPhone:
			l.Phone = f.Str
		case FldContact:
			l.Contact = f.Str
		case FldPAN:
			l.PAN = f.Str
		case FldGSTIN:
			l.GSTIN = f.Str
		case FldGSTState:
			l.State = f.Str
		case FldPin:
			if l.Pincode == "" {
				l.Pincode = f.Str
			}
		case FldGUID:
			l.GUID = f.Str
		case FldName:
			// In ledger pages, FldName sometimes holds parent group
			if l.Parent == "" && !strings.EqualFold(f.Str, l.Name) {
				l.Parent = f.Str
			}
		}
	}
	// Pincode might also be in address field 0x0A8F
	for _, f := range fields {
		if f.ID == 0x0A8F && f.Type == 'S' && l.Pincode == "" {
			l.Pincode = f.Str
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
