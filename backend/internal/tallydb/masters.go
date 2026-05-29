package tallydb

import (
	"encoding/binary"
	"fmt"
	"os"
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
	OpeningBal   float64  `json:"opening_balance,omitempty"`
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
	Godowns    []Godown    `json:"godowns"`
	Employees  []Employee  `json:"employees"`
}

// Unit is a measurement unit (PCS, KG, LTR etc.)
type Unit struct {
	Name   string `json:"name"`
	Symbol string `json:"symbol,omitempty"`
}

// Godown is a warehouse/location.
type Godown struct {
	Name   string `json:"name"`
	Parent string `json:"parent,omitempty"`
}

// Employee is a payroll employee.
type Employee struct {
	Name       string `json:"name"`
	Gender     string `json:"gender,omitempty"`
	FatherName string `json:"father_name,omitempty"`
	PFNumber   string `json:"pf_number,omitempty"`
	ESINumber  string `json:"esi_number,omitempty"`
	BankName   string `json:"bank_name,omitempty"`
	BankIFSC   string `json:"bank_ifsc,omitempty"`
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

	// Build group seq → name map from low-seq pages (pidx=1 or pidx=2 with fid=0x0002)
	groupBySeq := make(map[uint32]string)
	for _, page := range pages {
		seq := page.Header.SeqNum
		if seq > 100 {
			continue
		}
		pidx := page.Header.PageIdx
		if pidx != 1 && pidx != 2 {
			continue
		}
		name := getFieldStr(page.Fields, FldName)
		if name != "" && groupBySeq[seq] == "" {
			groupBySeq[seq] = name
		}
	}

	// First pass: collect ledger names by seq (from pidx=4 type=0x000B pages with FldLedgerName)
	ledgerSeqs := make(map[uint32]int) // seq -> index in m.Ledgers
	for _, page := range pages {
		if page.Header.PageIdx != 4 || page.Header.ObjType != 0x000B {
			continue
		}
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
		// Assign parent group from header[28:32]
		if parentName := groupBySeq[page.Header.ParentSeq]; parentName != "" {
			l.Parent = parentName
		}
		// Extract opening balance from fid=0x0A2B type 'L' (type marker 0x09)
		for _, f := range fields {
			if f.ID == 0x0A2B && f.Type == 'L' && f.Int64 != 0 {
				l.OpeningBal = float64(f.Int64) / 100000.0
				break
			}
		}
		ledgerSeqs[page.Header.SeqNum] = len(m.Ledgers)
		m.Ledgers = append(m.Ledgers, l)
	}

	// Second pass: enrich opening balances from other pidx pages of same seq
	// Also collect OBs from seqs NOT in ledgerSeqs (system ledgers like Cash, P&L)
	obBySeq := make(map[uint32]float64)
	for _, page := range pages {
		if page.Header.ObjType != 0x000B {
			continue
		}
		for _, f := range page.Fields {
			if f.ID == 0x0A2B && f.Type == 'L' && f.Int64 != 0 {
				seq := page.Header.SeqNum
				if _, exists := obBySeq[seq]; !exists {
					obBySeq[seq] = float64(f.Int64) / 100000.0
				}
				break
			}
		}
	}
	// Apply OBs to known ledgers
	for seq, ob := range obBySeq {
		if idx, ok := ledgerSeqs[seq]; ok {
			if m.Ledgers[idx].OpeningBal == 0 {
				m.Ledgers[idx].OpeningBal = ob
			}
		}
	}
	// For OBs on unknown seqs, find their name from fid=0x0002 or 0x01F7 on same seq
	// Also try reading UTF-16 string at page offset 28 (header name for system ledgers)
	nameBySeq := make(map[uint32]string)
	for _, page := range pages {
		seq := page.Header.SeqNum
		if _, need := obBySeq[seq]; !need {
			continue
		}
		if _, already := ledgerSeqs[seq]; already {
			continue
		}
		if nameBySeq[seq] != "" {
			continue
		}
		for _, f := range page.Fields {
			if f.Type == 'S' && (f.ID == 0x01F7 || f.ID == FldName) && f.Str != "" && len(f.Str) > 2 {
				nameBySeq[seq] = f.Str
				break
			}
		}
	}
	// Second attempt: read raw header string at offset 28 for seqs still without names
	rawData, _ := os.ReadFile(path)
	if rawData != nil {
		for pg := 1; pg < len(rawData)/PageSize; pg++ {
			off := pg * PageSize
			pageData := rawData[off : off+PageSize]
			seq := binary.LittleEndian.Uint32(pageData[4:8])
			if _, need := obBySeq[seq]; !need { continue }
			if _, already := ledgerSeqs[seq]; already { continue }
			if nameBySeq[seq] != "" { continue }
			pidx := binary.LittleEndian.Uint32(pageData[8:12])
			if pidx != 0 { continue }
			if binary.LittleEndian.Uint16(pageData[16:18]) != 0x000B { continue }
			// Read UTF-16 at offset 28 until null terminator
			end := 28
			for end < PageSize-1 && !(pageData[end] == 0 && pageData[end+1] == 0) { end += 2 }
			if end > 30 {
				s := decodeUTF16(pageData[28:end])
				if s != "" && len(s) > 2 {
					nameBySeq[seq] = s
				}
			}
		}
	}
	// Add system ledgers with their OBs
	for seq, name := range nameBySeq {
		ob := obBySeq[seq]
		if isVoucherTypeName(name) || isCurrencyName(name) {
			continue
		}
		l := Ledger{Name: name, OpeningBal: ob}
		l.Parent = inferSystemLedgerGroup(name)
		m.Ledgers = append(m.Ledgers, l)
	}

	// Third pass: enrich ledgers from pidx=0 pages (contact/tax details)
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
			case 0x0A97: // country dial code
				// skip (not useful for display)
			case 0x0A8F: // alternate pincode
				if l.Pincode == "" { l.Pincode = f.Str }
			}
		}
		// Numeric fields — dates only (balance needs computation from vouchers)
		for _, f := range page.Fields {
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

	// Third pass: groups from groupBySeq map (built from low-seq pidx=1/2 pages)
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
	// Also add groups from groupBySeq that weren't found in third pass
	for _, name := range groupBySeq {
		if !seenGroups[name] {
			seenGroups[name] = true
			m.Groups = append(m.Groups, Group{Name: name})
		}
	}

	m.StockItems = extractStockItems(dataDir)

	// Fourth pass: godowns (pidx=1 pages with name containing "Location" or matching godown pattern)
	for _, page := range pages {
		ot := page.Header.ObjType
		if (ot == 0x000B || ot == 0x0000) && page.Header.PageIdx == 1 {
			name := getFieldStr(page.Fields, FldName)
			if name != "" && (strings.Contains(name, "Location") || strings.Contains(name, "Godown") || strings.Contains(name, "Warehouse")) {
				display := name
				if len(name) > 2 && name[1] == '-' {
					display = name[2:]
				}
				m.Godowns = append(m.Godowns, Godown{Name: display})
			}
		}
	}

	// Fifth pass: employees (pidx=2 pages with gender field 0x0BEC or PF field 0x0BD6)
	for _, page := range pages {
		ot := page.Header.ObjType
		if (ot == 0x000B || ot == 0x0000) && page.Header.PageIdx == 2 {
			hasEmpField := false
			for _, f := range page.Fields {
				if f.Type == 'S' && (f.ID == 0x0BEC || f.ID == 0x0BD6 || f.ID == 0x0BF6) {
					hasEmpField = true
					break
				}
			}
			if !hasEmpField {
				continue
			}
			var emp Employee
			for _, f := range page.Fields {
				if f.Type != 'S' {
					continue
				}
				switch f.ID {
				case FldName:
					if emp.Name == "" { emp.Name = f.Str }
				case 0x0BEC:
					emp.Gender = f.Str
				case 0x0BF6:
					emp.FatherName = f.Str
				case 0x0BD6:
					emp.PFNumber = f.Str
				case 0x0BF7:
					emp.ESINumber = f.Str
				case 0x0BD8:
					emp.BankName = f.Str
				case 0x0BFD:
					emp.BankIFSC = f.Str
				}
			}
			if emp.Name != "" {
				m.Employees = append(m.Employees, emp)
			}
		}
	}

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

// extractStockItems gets stock items from Manager.1800 pidx=4 pages.
func extractStockItems(dataDir string) []StockItem {
	path := ResolveFile(dataDir, "Manager")
	if path == "" {
		return nil
	}
	pages, err := ReadFile(path)
	if err != nil {
		return nil
	}

	var items []StockItem
	seen := make(map[string]bool)
	for _, page := range pages {
		// Stock items are on pidx=4 type=0x000B pages with unit field 0x0FD4
		if page.Header.ObjType != 0x000B && page.Header.ObjType != 0x0000 {
			continue
		}
		if page.Header.PageIdx != 4 {
			continue
		}
		if !hasField(page.Fields, 0x0FD4) {
			continue
		}

		var item StockItem
		for _, f := range page.Fields {
			if f.Type != 'S' {
				continue
			}
			switch f.ID {
			case FldName:
				if item.Name == "" {
					item.Name = f.Str
				} else if item.Parent == "" {
					item.Parent = f.Str
				}
			case FldLedgerName:
				if item.HSN == "" && len(f.Str) >= 4 && len(f.Str) <= 10 {
					item.HSN = f.Str
				}
			case 0x0FD4:
				if item.Unit == "" {
					item.Unit = f.Str
				}
			}
		}
		if item.Name != "" && !seen[item.Name] {
			seen[item.Name] = true
			items = append(items, item)
		}
	}

	// Fallback: also get items from TranMgr if Manager didn't have them
	tranPath := ResolveFile(dataDir, "TranMgr")
	if tranPath == "" {
		return items
	}
	tranPages, err := ReadFile(tranPath)
	if err != nil {
		return items
	}
	for _, page := range tranPages {
		for _, f := range page.Fields {
			if f.Type == 'S' && f.ID == 0x0001 && f.Str != "" && !seen[f.Str] {
				seen[f.Str] = true
				item := StockItem{Name: f.Str}
				for _, f2 := range page.Fields {
					if f2.Type == 'S' && f2.ID == 0x0003 && len(f2.Str) >= 4 && len(f2.Str) <= 10 {
						item.HSN = f2.Str
						break
					}
				}
				for _, f2 := range page.Fields {
					if f2.Type == 'S' && f2.ID == 0x0004 && len(f2.Str) <= 10 {
						item.BaseUnit = f2.Str
						break
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

// inferSystemLedgerGroup determines the parent group for system/built-in ledgers.
// These are Tally's standard account names — same across ALL Tally installations.
func inferSystemLedgerGroup(name string) string {
	switch name {
	case "Cash":
		return "Cash-in-Hand"
	case "Profit & Loss A/c":
		return "Reserves & Surplus"
	}
	switch {
	case strings.HasPrefix(name, "Input CGST") || strings.HasPrefix(name, "Input SGST") ||
		strings.HasPrefix(name, "Input IGST") || strings.HasPrefix(name, "Output CGST") ||
		strings.HasPrefix(name, "Output SGST") || strings.HasPrefix(name, "Output IGST") ||
		strings.HasPrefix(name, "GST ") || strings.HasPrefix(name, "GST Payble") ||
		strings.HasPrefix(name, "GST Reverse") ||
		// Truncated header names from binary (e.g., "ST @9%", "GST @14%")
		(strings.HasPrefix(name, "ST @") && strings.Contains(name, "%")) ||
		(strings.HasPrefix(name, "GST @") && strings.Contains(name, "%")) ||
		strings.HasSuffix(name, "GST") || strings.Contains(name, "SGST") || strings.Contains(name, "CGST") || strings.Contains(name, "IGST"):
		return "Duties & Taxes"
	case strings.Contains(name, "ODA-") || strings.Contains(name, "OD A/c"):
		return "Bank OD A/c"
	case strings.Contains(name, "SBI") || strings.Contains(name, "AGCCA") ||
		strings.Contains(name, "CA -") || strings.Contains(name, "SBA -"):
		return "Bank Accounts"
	case strings.Contains(name, "SECURITY DEPOSIT") || strings.Contains(name, "CEMENT LTD") || strings.Contains(name, "HSIL"):
		return "Deposits (Asset)"
	default:
		return "Sundry Debtors"
	}
}
