package handler

import "net/http"

type VoucherHandler struct{ Base }

func (h *VoucherHandler) List(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	vouchers, err := h.DB.GetVouchers(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, vouchers)
}
