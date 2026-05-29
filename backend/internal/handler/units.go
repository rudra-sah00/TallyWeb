package handler

import "net/http"

type UnitHandler struct{ Base }

func (h *UnitHandler) List(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	units, err := h.DB.GetUnits(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, units)
}
