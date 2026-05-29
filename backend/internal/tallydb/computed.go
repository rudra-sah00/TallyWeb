package tallydb

import "time"

// LedgerBalance is a computed balance for a ledger/party.
type LedgerBalance struct {
	Name    string  `json:"name"`
	Debit   float64 `json:"debit"`
	Credit  float64 `json:"credit"`
	Balance float64 `json:"balance"` // positive = receivable, negative = payable
}

// Outstanding is an unpaid invoice.
type Outstanding struct {
	Party   string  `json:"party"`
	Number  string  `json:"invoice_number,omitempty"`
	Date    string  `json:"date,omitempty"`
	Amount  float64 `json:"amount"`
	DaysOld int     `json:"days_old,omitempty"`
}

// StockBalance is computed stock on hand per item.
type StockBalance struct {
	Name    string  `json:"name"`
	HSN     string  `json:"hsn,omitempty"`
	Unit    string  `json:"unit,omitempty"`
	InQty   float64 `json:"in_qty"`
	OutQty  float64 `json:"out_qty"`
	Balance float64 `json:"balance_qty"`
}

// ComputeLedgerBalances calculates debit/credit for each party from vouchers.
func (db *DB) ComputeLedgerBalances(folderName string) ([]LedgerBalance, error) {
	vouchers, err := db.GetVouchers(folderName)
	if err != nil {
		return nil, err
	}
	balances := make(map[string]*LedgerBalance)
	for _, v := range vouchers {
		if v.Party == "" || v.Amount == 0 {
			continue
		}
		b, ok := balances[v.Party]
		if !ok {
			b = &LedgerBalance{Name: v.Party}
			balances[v.Party] = b
		}
		// Sales = party owes us (debit), Purchase/Payment = we owe them (credit)
		switch v.Type {
		case "Sales":
			b.Debit += v.Amount
		case "Purchase":
			b.Credit += v.Amount
		case "Receipt":
			b.Credit += v.Amount
		case "Payment":
			b.Debit += v.Amount
		default:
			b.Debit += v.Amount // default: assume receivable
		}
	}
	var result []LedgerBalance
	for _, b := range balances {
		b.Balance = b.Debit - b.Credit
		result = append(result, *b)
	}
	return result, nil
}

// ComputeOutstanding returns unpaid invoices (vouchers with no matching receipt).
func (db *DB) ComputeOutstanding(folderName string) ([]Outstanding, error) {
	vouchers, err := db.GetVouchers(folderName)
	if err != nil {
		return nil, err
	}
	// Simple approach: each sales voucher with amount > 0 is outstanding
	// (proper bill-matching needs LinkMgr which we can't fully traverse yet)
	var result []Outstanding
	for _, v := range vouchers {
		if v.Party == "" || v.Amount == 0 {
			continue
		}
		if v.Type == "Sales" || (v.Type == "" && len(v.Items) > 0) {
			result = append(result, Outstanding{
				Party:  v.Party,
				Number: v.Number,
				Date:   v.Date,
				Amount: v.Amount,
			})
		}
	}
	return result, nil
}

// ComputeStockBalance calculates stock on hand from voucher line items.
func (db *DB) ComputeStockBalance(folderName string) ([]StockBalance, error) {
	vouchers, err := db.GetVouchers(folderName)
	if err != nil {
		return nil, err
	}
	stocks := make(map[string]*StockBalance)
	for _, v := range vouchers {
		for _, item := range v.Items {
			if item.Name == "" || item.Qty == 0 {
				continue
			}
			s, ok := stocks[item.Name]
			if !ok {
				s = &StockBalance{Name: item.Name, HSN: item.HSN, Unit: item.Unit}
				stocks[item.Name] = s
			}
			// Sales/Delivery = outward, Purchase/Receipt = inward
			switch v.Type {
			case "Purchase":
				s.InQty += item.Qty
			default: // Sales and others = outward
				s.OutQty += item.Qty
			}
		}
	}
	var result []StockBalance
	for _, s := range stocks {
		s.Balance = s.InQty - s.OutQty
		result = append(result, *s)
	}
	return result, nil
}

// DashboardOverview is the summary for the dashboard.
type DashboardOverview struct {
	TotalSales     float64 `json:"total_sales"`
	TotalPurchases float64 `json:"total_purchases"`
	VoucherCount   int     `json:"voucher_count"`
	LedgerCount    int     `json:"ledger_count"`
	GroupCount     int     `json:"group_count"`
	ItemCount      int     `json:"item_count"`
	EmployeeCount  int     `json:"employee_count"`
}

func (db *DB) GetOverview(folderName string) (*DashboardOverview, error) {
	vouchers, err := db.GetVouchers(folderName)
	if err != nil {
		return nil, err
	}
	masters, err := db.GetMasters(folderName)
	if err != nil {
		return nil, err
	}
	o := &DashboardOverview{
		VoucherCount:  len(vouchers),
		LedgerCount:   len(masters.Ledgers),
		GroupCount:    len(masters.Groups),
		ItemCount:     len(masters.StockItems),
		EmployeeCount: len(masters.Employees),
	}
	for _, v := range vouchers {
		switch v.Type {
		case "Sales":
			o.TotalSales += v.Amount
		case "Purchase":
			o.TotalPurchases += v.Amount
		default:
			if v.Amount > 0 {
				o.TotalSales += v.Amount
			}
		}
	}
	return o, nil
}

// AgingEntry is an aging analysis entry for a party.
type AgingEntry struct {
	Party    string  `json:"party"`
	Total    float64 `json:"total"`
	Current  float64 `json:"current"`   // 0-30 days
	Days30   float64 `json:"days_30"`   // 31-60 days
	Days60   float64 `json:"days_60"`   // 61-90 days
	Days90   float64 `json:"days_90"`   // 90+ days
}

// ComputeAging calculates outstanding aging by party.
func (db *DB) ComputeAging(folderName string) ([]AgingEntry, error) {
	vouchers, err := db.GetVouchers(folderName)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	aging := make(map[string]*AgingEntry)
	for _, v := range vouchers {
		if v.Type != "Sales" || v.Amount == 0 || v.Party == "" {
			continue
		}
		days := daysOld(v.Date, now)
		e, ok := aging[v.Party]
		if !ok {
			e = &AgingEntry{Party: v.Party}
			aging[v.Party] = e
		}
		e.Total += v.Amount
		switch {
		case days <= 30:
			e.Current += v.Amount
		case days <= 60:
			e.Days30 += v.Amount
		case days <= 90:
			e.Days60 += v.Amount
		default:
			e.Days90 += v.Amount
		}
	}
	var result []AgingEntry
	for _, e := range aging {
		result = append(result, *e)
	}
	return result, nil
}

func daysOld(dateStr string, now time.Time) int {
	if len(dateStr) != 10 {
		return 0
	}
	// DD-MM-YYYY
	t, err := time.Parse("02-01-2006", dateStr)
	if err != nil {
		return 0
	}
	return int(now.Sub(t).Hours() / 24)
}
