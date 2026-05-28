package handler

import "net/http"

type BankingHandler struct{ Base }

func (h *BankingHandler) List(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	entries, err := h.DB.GetBankEntries(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, entries)
}
