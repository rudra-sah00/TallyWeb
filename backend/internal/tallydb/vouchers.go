package tallydb

import (
	"fmt"
)

// AmountDivisor — Tally stores amounts in paise (value × 100).
const AmountDivisor = 100.0

// Voucher is a transaction record.
type Voucher struct {
	Number        string        `json:"number,omitempty"`
	Date          string        `json:"date,omitempty"`
	Type          string        `json:"type,omitempty"`
	Party         string        `json:"party,omitempty"`
	GSTIN         string        `json:"gstin,omitempty"`
	State         string        `json:"state,omitempty"`
	PlaceOfSupply string        `json:"place_of_supply,omitempty"`
	SellerGSTIN   string        `json:"seller_gstin,omitempty"`
	Address       []string      `json:"address,omitempty"`
	Narration     string        `json:"narration,omitempty"`
	Amount        float64       `json:"amount,omitempty"`
	TaxAmount     float64       `json:"tax_amount,omitempty"`
	Items         []VoucherItem `json:"items,omitempty"`
	VoucherID     string        `json:"voucher_id,omitempty"`
	EInvoiceIRN   string        `json:"e_invoice_irn,omitempty"`
	EWayBillNo    string        `json:"eway_bill_no,omitempty"`
	VehicleNo     string        `json:"vehicle_no,omitempty"`
	DocType       string        `json:"document_type,omitempty"`
}

// VoucherItem is a line item in a voucher.
type VoucherItem struct {
	Name   string  `json:"name"`
	HSN    string  `json:"hsn,omitempty"`
	Unit   string  `json:"unit,omitempty"`
	Qty    float64 `json:"qty,omitempty"`
	Rate   float64 `json:"rate,omitempty"`
	Amount float64 `json:"amount,omitempty"`
	GSTRate float64 `json:"gst_rate,omitempty"`
}

// ParseVouchers reads TranMgr.1800/.900 and extracts voucher records.
// Uses seq-based grouping: groups all pages by SeqNum, then processes each group.
func ParseVouchers(dataDir string) ([]Voucher, error) {
	path := ResolveFile(dataDir, "TranMgr")
	if path == "" {
		return nil, fmt.Errorf("TranMgr.1800/.900 not found in %s", dataDir)
	}
	pages, err := ReadFile(path)
	if err != nil {
		return nil, err
	}

	// Group pages by sequence number
	seqGroups := make(map[uint32][]Page)
	var seqOrder []uint32
	for _, page := range pages {
		seq := page.Header.SeqNum
		if seq == 0 {
			continue
		}
		if _, exists := seqGroups[seq]; !exists {
			seqOrder = append(seqOrder, seq)
		}
		seqGroups[seq] = append(seqGroups[seq], page)
	}

	// Process each seq group as a potential voucher
	var vouchers []Voucher
	for _, seq := range seqOrder {
		group := seqGroups[seq]

		// Primary vouchers: have ObjType=0x0005
		hasDataPage := false
		for _, p := range group {
			if p.Header.ObjType == 0x0005 {
				hasDataPage = true
				break
			}
		}

		if hasDataPage {
			v := Voucher{}
			for _, p := range group {
				if isVoucherItemPage(p.Fields) {
					v.Items = append(v.Items, parseVoucherItems(p.Fields)...)
				}
				for _, f := range p.Fields {
					enrichVoucher(&v, f, p.Header.PageIdx)
				}
			}
			if v.Amount > 0 {
				for _, p := range group {
					if p.Header.ObjType == 0x0005 && p.Header.PageIdx == 1 {
						for _, f := range p.Fields {
							if f.Type == 'L' && (f.ID == 0x0003 || f.ID == 0x0004) {
								tax := float64(f.Int64) / 100000.0
								if tax > 0 && tax < v.Amount*0.15 {
									v.TaxAmount += tax
								}
							}
						}
					}
				}
			}
			if v.Number != "" || v.Party != "" {
				vouchers = append(vouchers, v)
			}
			continue
		}

		// Secondary vouchers: 0x000B+0x0042 only (Journals, Payments, Contras, NEFT etc)
		has0B := false
		has42 := false
		for _, p := range group {
			if p.Header.ObjType == 0x000B { has0B = true }
			if p.Header.ObjType == 0x0042 { has42 = true }
		}
		if !has0B || !has42 {
			continue
		}

		v := Voucher{}
		for _, p := range group {
			for _, f := range p.Fields {
				if f.Type == 'S' && f.ID == 0x0006 && v.Number == "" { v.Number = f.Str }
				if f.Type == 'S' && f.ID == 0x00CC && v.Number == "" { v.Number = f.Str }
				if f.Type == 'S' && f.ID == 0x07D5 && v.Number == "" { v.Number = f.Str }
				if f.Type == 'S' && f.ID == 0x000D && v.Party == "" { v.Party = f.Str }
				if f.Type == 'S' && f.ID == 0x03ED && v.Party == "" { v.Party = f.Str }
				if f.Type == 'S' && f.ID == 0x03F4 && v.Narration == "" { v.Narration = f.Str }
				if f.Type == 'D' && (f.ID == 0x0002 || f.ID == 0x00CB) && v.Date == "" {
					days := int(f.Int32) - 2
					year := 1900
					for { diy := 365; if (year%4==0&&year%100!=0)||year%400==0{diy=366}; if days<diy{break}; days-=diy; year++ }
					month := 1
					for _, md := range []int{31,28,31,30,31,30,31,31,30,31,30,31} { m:=md; if month==2&&((year%4==0&&year%100!=0)||year%400==0){m=29}; if days<m{break}; days-=m; month++ }
					v.Date = fmt.Sprintf("%02d-%02d-%04d", days+1, month, year)
				}
				// Amounts on 0x0042 pages use fid=0x0002 type 'L' (type marker 0x09)
				if f.Type == 'L' && v.Amount == 0 {
					amt := float64(f.Int64) / 100000.0
					if amt > 1 && amt < 10000000 {
						v.Amount = amt
					}
				}
			}
		}
		if v.Number != "" || v.Amount > 0 {
			vouchers = append(vouchers, v)
		}
	}
	return vouchers, nil
}

func isVoucherHeaderPage(fields []Field) bool {
	// A page starts a new voucher if it has party name (0x000D) + GST type (0x000F)
	hasParty := false
	hasGST := false
	for _, f := range fields {
		if f.ID == 0x000D && f.Type == 'S' { hasParty = true }
		if f.ID == 0x000F && f.Type == 'S' { hasGST = true }
		if f.ID == 0x0006 && f.Type == 'S' && len(f.Str) >= 1 { return true }
	}
	return hasParty && hasGST
}

func isVoucherItemPage(fields []Field) bool {
	hasName, hasUnit := false, false
	for _, f := range fields {
		if f.ID == 0x0001 && f.Type == 'S' { hasName = true }
		if f.ID == 0x0004 && f.Type == 'S' { hasUnit = true }
	}
	return hasName && hasUnit
}

func isVoucherDetailPage(fields []Field) bool {
	for _, f := range fields {
		if f.ID == 0x000D && f.Type == 'S' { return true }
		if f.ID == 0x03ED && f.Type == 'S' { return true }
		// Pages with date field 0x0006 as string like "04-04-2025"
		if f.ID == 0x0006 && f.Type == 'S' && len(f.Str) >= 8 && (f.Str[2] == '-' || f.Str[2] == '/') { return true }
	}
	return false
}

func parseVoucherHeader(fields []Field) *Voucher {
	v := &Voucher{}
	for _, f := range fields {
		switch {
		case f.Type == 'S' && f.ID == FldNarration:
			if v.Party == "" { v.Party = f.Str }
		case f.Type == 'S' && f.ID == 0x00CC:
			if v.Number == "" { v.Number = f.Str }
		case f.Type == 'S' && f.ID == 0x0003:
			if v.Number == "" { v.Number = f.Str }
		case f.Type == 'S' && f.ID == 0x03ED:
			if v.Party == "" { v.Party = f.Str }
		case f.Type == 'D' && f.ID == 0x0002:
			if v.Date == "" {
				days := int(f.Int32) - 2
				year := 1900
				for {
					diy := 365
					if (year%4 == 0 && year%100 != 0) || year%400 == 0 { diy = 366 }
					if days < diy { break }
					days -= diy
					year++
				}
				month := 1
				for _, md := range []int{31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31} {
					m := md
					if month == 2 && ((year%4 == 0 && year%100 != 0) || year%400 == 0) { m = 29 }
					if days < m { break }
					days -= m
					month++
				}
				v.Date = fmt.Sprintf("%02d-%02d-%04d", days+1, month, year)
			}
		}
	}
	return v
}

// extractVoucherType parses compound string "2026{ref}Outward Invoice{number}"
func extractVoucherType(s string) string {
	types := []string{"Outward Invoice", "Inward Invoice", "Payment", "Receipt",
		"Journal", "Contra", "Credit Note", "Debit Note", "Sales Order",
		"Purchase Order", "Delivery Note", "Receipt Note"}
	for _, t := range types {
		if len(s) > len(t) {
			for i := 0; i <= len(s)-len(t); i++ {
				if s[i:i+len(t)] == t {
					switch t {
					case "Outward Invoice":
						return "Sales"
					case "Inward Invoice":
						return "Purchase"
					default:
						return t
					}
				}
			}
		}
	}
	return ""
}

func enrichVoucher(v *Voucher, f Field, pidx uint32) {
	switch {
	case f.Type == 'S' && f.ID == 0x000D && v.Party == "":
		v.Party = f.Str
	case f.Type == 'S' && f.ID == 0x0016 && v.Party == "":
		v.Party = f.Str
	case f.Type == 'S' && f.ID == 0x00CE && v.Party == "":
		v.Party = f.Str
	case f.Type == 'S' && f.ID == 0x040F && v.Party == "":
		v.Party = f.Str
	case f.Type == 'S' && f.ID == 0x0411 && v.Party == "":
		v.Party = f.Str
	case f.Type == 'S' && f.ID == 0x03ED && v.Party == "":
		v.Party = f.Str
	case f.Type == 'S' && f.ID == 0x0006 && v.Number == "":
		v.Number = f.Str
	case f.Type == 'S' && f.ID == 0x00CC && v.Number == "":
		v.Number = f.Str
	case f.Type == 'S' && (f.ID == 0x0005 || f.ID == 0x000E) && v.State == "" && len(f.Str) > 3:
		v.State = f.Str
	case f.Type == 'S' && (f.ID == 0x000F || f.ID == 0x0023 || f.ID == 0x01FC) && v.GSTIN == "" && len(f.Str) == 15:
		v.GSTIN = f.Str
	case f.Type == 'S' && f.ID == 0x0212 && v.PlaceOfSupply == "":
		v.PlaceOfSupply = f.Str
	case f.Type == 'S' && f.ID == 0x0213 && v.SellerGSTIN == "" && len(f.Str) == 15:
		v.SellerGSTIN = f.Str
	case f.Type == 'S' && f.ID == 0x03F4 && v.Narration == "":
		v.Narration = f.Str
	case f.Type == 'S' && f.ID == 0x000A && v.VoucherID == "":
		v.VoucherID = f.Str
	case f.Type == 'S' && f.ID == 0x002D && v.EInvoiceIRN == "" && len(f.Str) > 10:
		v.EInvoiceIRN = f.Str
	case f.Type == 'S' && (f.ID == 0x0025 || f.ID == 0x0017 || f.ID == 0x03EE || f.ID == 0x00CF):
		if f.Str != "" && len(f.Str) > 2 && len(v.Address) < 5 {
			dup := false
			for _, a := range v.Address {
				if a == f.Str { dup = true; break }
			}
			if !dup { v.Address = append(v.Address, f.Str) }
		}
	case f.Type == 'D' && (f.ID == 0x0002 || f.ID == 0x00CB) && v.Date == "":
		days := int(f.Int32) - 2
		year := 1900
		for { diy := 365; if (year%4==0 && year%100!=0) || year%400==0 { diy=366 }; if days<diy { break }; days-=diy; year++ }
		month := 1
		for _, md := range []int{31,28,31,30,31,30,31,31,30,31,30,31} { m:=md; if month==2 && ((year%4==0 && year%100!=0) || year%400==0) { m=29 }; if days<m { break }; days-=m; month++ }
		v.Date = fmt.Sprintf("%02d-%02d-%04d", days+1, month, year)
	case f.Type == 'L' && f.ID == 0x0008 && v.Amount == 0:
		amt := float64(f.Int64) / 100000.0
		if amt > 1 && amt < 10000000 {
			v.Amount = amt
		}
	}
}

func parseVoucherItems(fields []Field) []VoucherItem {
	var items []VoucherItem
	var cur VoucherItem
	amtIdx := 0

	for _, f := range fields {
		if f.Type == 'S' {
			switch f.ID {
			case 0x0001:
				if cur.Name != "" {
					items = append(items, cur)
					cur = VoucherItem{}
					amtIdx = 0
				}
				cur.Name = f.Str
			case 0x0003:
				cur.HSN = f.Str
			case 0x0004:
				cur.Unit = f.Str
			}
		}
		if f.Type == 'L' && cur.Name != "" {
			val := float64(f.Int64) / AmountDivisor
			switch amtIdx {
			case 0: cur.Qty = val
			case 1: cur.Rate = val
			case 2: cur.Amount = val
			case 3: cur.GSTRate = val
			}
			amtIdx++
		}
	}
	if cur.Name != "" {
		items = append(items, cur)
	}
	return items
}
