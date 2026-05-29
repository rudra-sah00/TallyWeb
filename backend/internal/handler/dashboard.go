package handler

import "net/http"

type DashboardHandler struct{ Base }

func (h *DashboardHandler) Overview(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	overview, err := h.DB.GetOverview(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, overview)
}
