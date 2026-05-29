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
