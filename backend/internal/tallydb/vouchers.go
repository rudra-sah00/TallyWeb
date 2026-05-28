package tallydb

import (
	"fmt"
)

// AmountDivisor — Tally stores amounts as value × 100,000.
const AmountDivisor = 100000.0

// Voucher is a transaction record.
type Voucher struct {
	Number      string        `json:"number,omitempty"`
	Date        string        `json:"date,omitempty"`
	Type        string        `json:"type,omitempty"`
	Party       string        `json:"party,omitempty"`
	GSTIN       string        `json:"gstin,omitempty"`
	State       string        `json:"state,omitempty"`
	PlaceOfSupply string      `json:"place_of_supply,omitempty"`
	SellerGSTIN string        `json:"seller_gstin,omitempty"`
	Address     []string      `json:"address,omitempty"`
	Narration   string        `json:"narration,omitempty"`
	Amount      float64       `json:"amount,omitempty"`
	TaxAmount   float64       `json:"tax_amount,omitempty"`
	Items       []VoucherItem `json:"items,omitempty"`
	VoucherID   string        `json:"voucher_id,omitempty"`
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
func ParseVouchers(dataDir string) ([]Voucher, error) {
	path := ResolveFile(dataDir, "TranMgr")
	if path == "" {
		return nil, fmt.Errorf("TranMgr.1800/.900 not found in %s", dataDir)
	}
	pages, err := ReadFile(path)
	if err != nil {
		return nil, err
	}

	var vouchers []Voucher
	var current *Voucher

	for _, page := range pages {
		if isVoucherHeaderPage(page.Fields) {
			if current != nil && (current.Number != "" || current.Party != "") {
				vouchers = append(vouchers, *current)
			}
			current = parseVoucherHeader(page.Fields)
		} else if isVoucherItemPage(page.Fields) && current != nil {
			items := parseVoucherItems(page.Fields)
			current.Items = append(current.Items, items...)
		} else if current != nil {
			enrichVoucher(current, page.Fields)
		}
	}
	if current != nil && (current.Number != "" || current.Party != "") {
		vouchers = append(vouchers, *current)
	}
	return vouchers, nil
}

func isVoucherHeaderPage(fields []Field) bool {
	for _, f := range fields {
		if f.ID == FldVchUser && f.Type == 'S' {
			return true
		}
		if f.ID == 0x00CC && f.Type == 'S' {
			return true
		}
	}
	return false
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
		case f.Type == 'S' && f.ID == FldVchNarration:
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

func enrichVoucher(v *Voucher, fields []Field) {
	for _, f := range fields {
		if f.Type == 'S' {
			switch f.ID {
			case 0x000D: // party name
				if v.Party == "" { v.Party = f.Str }
			case 0x0006: // date as string
				if v.Date == "" && len(f.Str) >= 8 { v.Date = f.Str }
			case 0x0004: // invoice number
				if v.Number == "" { v.Number = f.Str }
			case 0x000F, 0x01FB: // GSTIN
				if v.GSTIN == "" && len(f.Str) == 15 { v.GSTIN = f.Str }
			case 0x0005, 0x000E: // state
				if v.State == "" && len(f.Str) > 3 { v.State = f.Str }
			case 0x03ED: // party from .900
				if v.Party == "" { v.Party = f.Str }
			case 0x03F4: // narration/reference
				if v.Narration == "" { v.Narration = f.Str }
			case 0x0213: // seller GSTIN
				if v.SellerGSTIN == "" && len(f.Str) == 15 { v.SellerGSTIN = f.Str }
			case 0x0212: // place of supply
				if v.PlaceOfSupply == "" && len(f.Str) > 2 { v.PlaceOfSupply = f.Str }
			case 0x0025, 0x0017, 0x03EE, 0x00CF: // buyer address lines
				if f.Str != "" && len(f.Str) > 2 {
					dup := false
					for _, a := range v.Address {
						if a == f.Str { dup = true; break }
					}
					if !dup && len(v.Address) < 5 {
						v.Address = append(v.Address, f.Str)
					}
				}
			case 0x000A: // voucher unique ID
				if v.VoucherID == "" { v.VoucherID = f.Str }
			}
		}
		// Date field (type 0x0D): days since 1900-01-01
		if f.Type == 'D' && f.ID == 0x0002 && v.Date == "" {
			days := int(f.Int32)
			// Convert: 1900-01-01 + days - 2 (Excel epoch)
			year := 1900
			days -= 2
			for {
				diy := 365
				if (year%4 == 0 && year%100 != 0) || year%400 == 0 { diy = 366 }
				if days < diy { break }
				days -= diy
				year++
			}
			month := 1
			for _, mdays := range []int{31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31} {
				md := mdays
				if month == 2 && ((year%4 == 0 && year%100 != 0) || year%400 == 0) { md = 29 }
				if days < md { break }
				days -= md
				month++
			}
			v.Date = fmt.Sprintf("%02d-%02d-%04d", days+1, month, year)
		}
		// Extract total amount from 8-byte field on detail pages
		if f.Type == 'L' && (f.ID == 0x0002 || f.ID == 0x0008) && v.Amount == 0 {
			amt := float64(f.Int64) / AmountDivisor
			if amt > 0 { v.Amount = amt }
		}
	}
}

func parseVoucherItems(fields []Field) []VoucherItem {
	var items []VoucherItem
	var cur VoucherItem
	amtIdx := 0 // track which 8-byte amount belongs to which item

	for _, f := range fields {
		if f.Type == 'S' {
			switch f.ID {
			case 0x0001: // new item name
				if cur.Name != "" {
					items = append(items, cur)
					cur = VoucherItem{}
					amtIdx = 0
				}
				cur.Name = f.Str
			case 0x0003: // HSN
				cur.HSN = f.Str
			case 0x0004: // Unit
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
