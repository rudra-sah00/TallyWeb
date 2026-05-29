package tallydb

import "fmt"

// GSTReturn is pre-computed GST data from Aggr.1800.
type GSTReturn struct {
	HSN      string  `json:"hsn,omitempty"`
	Unit     string  `json:"unit,omitempty"`
	Rate     float64 `json:"gst_rate"`
	Qty      float64 `json:"quantity"`
	Taxable  float64 `json:"taxable_value"`
	CGST     float64 `json:"cgst"`
	SGST     float64 `json:"sgst"`
	State    string  `json:"state,omitempty"`
}

// ParseGSTReturns reads Aggr.1800 for pre-computed GST data.
func ParseGSTReturns(dataDir string) ([]GSTReturn, error) {
	path := ResolveFile(dataDir, "Aggr")
	if path == "" {
		return nil, fmt.Errorf("Aggr.1800 not found")
	}
	pages, err := ReadFile(path)
	if err != nil {
		return nil, err
	}

	var returns []GSTReturn
	for _, page := range pages {
		if page.Header.ObjType != 0x0042 {
			continue
		}
		// pidx=0 pages have state-level summaries
		// pidx=2/3 pages have HSN-level detail with amounts
		var entry GSTReturn
		hasAmount := false

		for _, f := range page.Fields {
			switch {
			case f.Type == 'S' && f.ID == 0x0002:
				s := f.Str
				// Could be unit ("PCS-PIECES") or state ("Odisha") or label
				if len(s) > 3 && s != "GSTRegistration" && s != "Stat Date" && s != "Return Name" && s != "HSNCode" && s != "HSNDescription" && s != "PartyGSTIN" {
					if contains(s, "-") && (contains(s, "PCS") || contains(s, "MTR") || contains(s, "KG") || contains(s, "LTR")) {
						entry.Unit = s
					} else if len(s) < 20 && !contains(s, ":") {
						if entry.State == "" {
							entry.State = s
						}
					}
				}
			case f.Type == 'L' && f.ID == 0x0002:
				// GST rate stored as amount (Rs.18.00 = 18%)
				rate := float64(f.Int64) / AmountDivisor
				if rate > 0 && rate <= 28 {
					entry.Rate = rate
				}
			case f.Type == 'L' && f.ID == 0x07E0:
				entry.Qty = float64(f.Int64) / AmountDivisor
				hasAmount = true
			case f.Type == 'L' && f.ID == 0x07D3:
				entry.CGST = float64(f.Int64) / AmountDivisor
				hasAmount = true
			case f.Type == 'L' && f.ID == 0x07D4:
				entry.SGST = float64(f.Int64) / AmountDivisor
				hasAmount = true
			case f.Type == 'L' && f.ID == 0x07DB:
				entry.Taxable = float64(f.Int64) / AmountDivisor
				hasAmount = true
			case f.Type == 'L' && f.ID == 0x07DC:
				// duplicate qty field
			}
		}

		if hasAmount && (entry.Taxable > 0 || entry.CGST > 0) {
			returns = append(returns, entry)
		}
	}
	return returns, nil
}

func contains(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
