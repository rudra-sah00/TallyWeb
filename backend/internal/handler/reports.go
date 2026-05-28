package handler

import "net/http"

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
