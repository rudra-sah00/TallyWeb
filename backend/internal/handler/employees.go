package handler

import "net/http"

type EmployeeHandler struct{ Base }

func (h *EmployeeHandler) List(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	masters, err := h.DB.GetMasters(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, masters.Employees)
}
