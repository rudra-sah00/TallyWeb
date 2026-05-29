package handler

import "net/http"

type VoucherHandler struct{ Base }

func (h *VoucherHandler) List(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	vtype := r.URL.Query().Get("type")
	vouchers, err := h.DB.GetVouchersByType(folder, vtype)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, vouchers)
}

func (h *VoucherHandler) Detail(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	id := r.PathValue("id")
	if id == "" {
		WriteError(w, http.StatusBadRequest, "voucher id required")
		return
	}
	vouchers, err := h.DB.GetVouchers(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	for _, v := range vouchers {
		if v.Number == id || v.VoucherID == id {
			WriteJSON(w, http.StatusOK, v)
			return
		}
	}
	WriteError(w, http.StatusNotFound, "voucher not found")
}

func (h *VoucherHandler) ByParty(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	party := r.PathValue("name")
	if party == "" {
		WriteError(w, http.StatusBadRequest, "party name required")
		return
	}
	vouchers := h.DB.GetVouchersByParty(folder, party)
	WriteJSON(w, http.StatusOK, vouchers)
}
