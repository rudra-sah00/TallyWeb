package handler

import (
	"net/http"
	"sort"
	"strings"
)

type ReportHandler struct{ Base }

func (h *ReportHandler) TrialBalance(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	tb, err := h.DB.GetTrialBalance(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, tb)
}

func (h *ReportHandler) GSTR1(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	gst, err := h.DB.GetGSTR1Summary(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, gst)
}

func (h *ReportHandler) GSTReturns(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	data, err := h.DB.GetGSTReturns(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, data)
}

func (h *ReportHandler) ProfitLoss(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	vouchers, err := h.DB.GetVouchers(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var totalSales, totalExpenses float64
	for _, v := range vouchers {
		if v.Amount > 0 {
			totalSales += v.Amount
		}
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"total_income":  totalSales,
		"total_expense": totalExpenses,
		"net_profit":    totalSales - totalExpenses,
	})
}

func (h *ReportHandler) LedgerBalances(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	data, err := h.DB.ComputeLedgerBalances(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, data)
}

func (h *ReportHandler) Outstanding(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	data, err := h.DB.ComputeOutstanding(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, data)
}

func (h *ReportHandler) StockBalance(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	data, err := h.DB.ComputeStockBalance(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, data)
}

func (h *ReportHandler) DayBook(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	vouchers, err := h.DB.GetVouchers(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	// Sort by date (DD-MM-YYYY format)
	sort.Slice(vouchers, func(i, j int) bool {
		di, dj := vouchers[i].Date, vouchers[j].Date
		if len(di) == 10 && len(dj) == 10 {
			// Convert DD-MM-YYYY to YYYY-MM-DD for sorting
			yi := di[6:10] + di[3:5] + di[0:2]
			yj := dj[6:10] + dj[3:5] + dj[0:2]
			return yi < yj
		}
		return di < dj
	})
	WriteJSON(w, http.StatusOK, vouchers)
}

func (h *ReportHandler) Aging(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	data, err := h.DB.ComputeAging(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, data)
}

func (h *ReportHandler) CashBankBook(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	vouchers, err := h.DB.GetVouchers(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	// Filter to vouchers where party is Cash or Bank
	var entries []map[string]any
	for _, v := range vouchers {
		if v.Party == "Cash" || strings.Contains(v.Party, "SBI") || strings.Contains(v.Party, "BOB") {
			entries = append(entries, map[string]any{
				"date":   v.Date,
				"number": v.Number,
				"type":   v.Type,
				"party":  v.Party,
				"amount": v.Amount,
			})
		}
	}
	WriteJSON(w, http.StatusOK, entries)
}

func (h *ReportHandler) Payables(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	vouchers, err := h.DB.GetVouchers(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	payables := make(map[string]float64)
	for _, v := range vouchers {
		if v.Type == "Purchase" && v.Party != "" && v.Amount > 0 {
			payables[v.Party] += v.Amount
		}
	}
	var result []map[string]any
	for party, amt := range payables {
		result = append(result, map[string]any{"party": party, "amount": amt})
	}
	WriteJSON(w, http.StatusOK, result)
}

func (h *ReportHandler) CashFlow(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	vouchers, err := h.DB.GetVouchers(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var inflow, outflow float64
	months := make(map[string][2]float64)
	for _, v := range vouchers {
		if v.Amount == 0 || len(v.Date) < 10 { continue }
		month := v.Date[3:10]
		m := months[month]
		if v.Type == "Sales" {
			inflow += v.Amount
			m[0] += v.Amount
		} else {
			outflow += v.Amount
			m[1] += v.Amount
		}
		months[month] = m
	}
	var monthly []map[string]any
	for month, m := range months {
		monthly = append(monthly, map[string]any{"month": month, "inflow": m[0], "outflow": m[1], "net": m[0] - m[1]})
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"total_inflow": inflow, "total_outflow": outflow, "net_cash_flow": inflow - outflow, "monthly": monthly,
	})
}

func (h *ReportHandler) FundsFlow(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	vouchers, err := h.DB.GetVouchers(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var sources, applications float64
	for _, v := range vouchers {
		if v.Type == "Sales" { sources += v.Amount }
		if v.Type == "Purchase" { applications += v.Amount }
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"sources": sources, "applications": applications, "net_change": sources - applications,
	})
}

func (h *ReportHandler) RatioAnalysis(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	vouchers, err := h.DB.GetVouchers(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var sales, purchases, debtors, creditors float64
	for _, v := range vouchers {
		switch v.Type {
		case "Sales": sales += v.Amount; debtors += v.Amount
		case "Purchase": purchases += v.Amount; creditors += v.Amount
		}
	}
	grossProfit := sales - purchases
	gpPercent := 0.0
	if sales > 0 { gpPercent = grossProfit / sales * 100 }
	currentRatio := 0.0
	if creditors > 0 { currentRatio = debtors / creditors }
	WriteJSON(w, http.StatusOK, map[string]any{
		"gross_profit": grossProfit, "gross_profit_pct": gpPercent,
		"current_ratio": currentRatio, "working_capital": debtors - creditors,
		"total_sales": sales, "total_purchases": purchases,
	})
}

func (h *ReportHandler) Statistics(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	vouchers, _ := h.DB.GetVouchers(folder)
	masters, _ := h.DB.GetMasters(folder)
	types := make(map[string]int)
	for _, v := range vouchers { types[v.Type]++ }
	lc, ic := 0, 0
	if masters != nil { lc = len(masters.Ledgers); ic = len(masters.StockItems) }
	WriteJSON(w, http.StatusOK, map[string]any{
		"voucher_types": types, "total_vouchers": len(vouchers),
		"ledger_count": lc, "stock_item_count": ic,
	})
}

func (h *ReportHandler) Search(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	q := strings.ToLower(r.URL.Query().Get("q"))
	if q == "" { WriteError(w, http.StatusBadRequest, "q required"); return }
	vouchers, _ := h.DB.GetVouchers(folder)
	masters, _ := h.DB.GetMasters(folder)
	var results []map[string]any
	for _, v := range vouchers {
		if strings.Contains(strings.ToLower(v.Number), q) || strings.Contains(strings.ToLower(v.Party), q) {
			results = append(results, map[string]any{"type": "voucher", "number": v.Number, "party": v.Party, "amount": v.Amount, "date": v.Date})
			if len(results) >= 20 { break }
		}
	}
	if masters != nil && len(results) < 20 {
		for _, l := range masters.Ledgers {
			if strings.Contains(strings.ToLower(l.Name), q) {
				results = append(results, map[string]any{"type": "ledger", "name": l.Name, "parent": l.Parent})
				if len(results) >= 20 { break }
			}
		}
	}
	if masters != nil && len(results) < 20 {
		for _, s := range masters.StockItems {
			if strings.Contains(strings.ToLower(s.Name), q) {
				results = append(results, map[string]any{"type": "stock_item", "name": s.Name, "hsn": s.HSN})
				if len(results) >= 20 { break }
			}
		}
	}
	WriteJSON(w, http.StatusOK, results)
}
