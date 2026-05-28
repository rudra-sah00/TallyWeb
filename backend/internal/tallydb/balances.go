package tallydb

// LedgerBalance holds computed balance for a ledger.
type LedgerBalance struct {
	Name    string  `json:"name"`
	Parent  string  `json:"parent,omitempty"`
	Debit   float64 `json:"debit"`
	Credit  float64 `json:"credit"`
	Balance float64 `json:"balance"` // Credit - Debit (positive = credit balance)
}

// DashboardOverview is a summary of financials.
type DashboardOverview struct {
	TotalSales     float64 `json:"total_sales"`
	TotalPurchases float64 `json:"total_purchases"`
	VoucherCount   int     `json:"voucher_count"`
	LedgerCount    int     `json:"ledger_count"`
	GroupCount     int     `json:"group_count"`
	ItemCount      int     `json:"item_count"`
}

// GetOverview computes financial overview from data.
func (db *DB) GetOverview(folderName string) (*DashboardOverview, error) {
	masters, err := db.GetMasters(folderName)
	if err != nil {
		return nil, err
	}

	vouchers, err := db.GetVouchers(folderName)
	if err != nil {
		vouchers = nil
	}

	overview := &DashboardOverview{
		LedgerCount:  len(masters.Ledgers),
		GroupCount:   len(masters.Groups),
		ItemCount:    len(masters.StockItems),
		VoucherCount: len(vouchers),
	}

	for _, v := range vouchers {
		if v.Amount > 0 && len(v.Items) > 0 {
			overview.TotalSales += v.Amount
		}
	}

	return overview, nil
}
