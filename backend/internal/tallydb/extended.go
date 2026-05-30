package tallydb

import "fmt"

// PriceList is a named price level with item prices.
type PriceList struct {
	Name  string           `json:"name"`
	Items []PriceListItem  `json:"items,omitempty"`
}

// PriceListItem is a single item's price in a price list.
type PriceListItem struct {
	ItemName string  `json:"item_name"`
	Rate     float64 `json:"rate"`
}

// ParsePriceLists extracts price list names from Manager.1800.
// Price lists are stored as pidx=0 pages with fid=0x0002 containing the list name.
func ParsePriceLists(dataDir string) ([]PriceList, error) {
	path := ResolveFile(dataDir, "Manager")
	if path == "" {
		return nil, fmt.Errorf("Manager.1800 not found")
	}
	pages, err := ReadFile(path)
	if err != nil {
		return nil, err
	}

	seen := make(map[string]bool)
	var lists []PriceList
	for _, page := range pages {
		if page.Header.ObjType != 0x000B {
			continue
		}
		if page.Header.PageIdx != 0 {
			continue
		}
		for _, f := range page.Fields {
			if f.Type == 'S' && f.ID == FldName && len(f.Str) > 2 {
				// Price list names typically contain "Price" or are known patterns
				name := f.Str
				if !seen[name] && isPriceListName(name) {
					seen[name] = true
					lists = append(lists, PriceList{Name: name})
				}
			}
		}
	}

	// Also collect from pidx=5 pages which have price list assignments
	for _, page := range pages {
		if page.Header.PageIdx != 5 {
			continue
		}
		for _, f := range page.Fields {
			if f.Type == 'S' && f.ID == FldName && len(f.Str) > 2 {
				name := f.Str
				if !seen[name] && isPriceListName(name) {
					seen[name] = true
					lists = append(lists, PriceList{Name: name})
				}
			}
		}
	}
	return lists, nil
}

func isPriceListName(name string) bool {
	// Price list names in Tally are things like "DPL Price", "MRP", "Govt. Price", "Trade Discount @18%"
	// They do NOT contain parentheses or "Pvt" or "Ltd" (those are party names)
	for _, exclude := range []string{"(", "Pvt", "Ltd", "Bureau"} {
		for i := 0; i <= len(name)-len(exclude); i++ {
			if name[i:i+len(exclude)] == exclude {
				return false
			}
		}
	}
	for _, kw := range []string{"Price", "PRICE", "MRP", "Retail Price", "Wholesale", "Trade Discount"} {
		for i := 0; i <= len(name)-len(kw); i++ {
			if name[i:i+len(kw)] == kw {
				return true
			}
		}
	}
	return false
}

// VoucherStatus flags from VchStatus.1800.
type VoucherStatus struct {
	VoucherID  string `json:"voucher_id"`
	Cancelled  bool   `json:"cancelled,omitempty"`
	Optional   bool   `json:"optional,omitempty"`
	PostDated  bool   `json:"post_dated,omitempty"`
}
