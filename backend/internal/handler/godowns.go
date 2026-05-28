package handler

import "net/http"

type GodownHandler struct{ Base }

func (h *GodownHandler) List(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	masters, err := h.DB.GetMasters(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, masters.Godowns)
}
