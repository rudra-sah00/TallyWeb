package handler

import "net/http"

type CompanyHandler struct{ Base }

func (h *CompanyHandler) List(w http.ResponseWriter, r *http.Request) {
	companies := h.DB.ListCompanies()
	WriteJSON(w, http.StatusOK, companies)
}

func (h *CompanyHandler) Details(w http.ResponseWriter, r *http.Request) {
	folder := r.PathValue("name")
	if folder == "" {
		folder = h.CompanyFolder(r)
	}
	info, err := h.DB.GetCompanyInfo(folder)
	if err != nil {
		WriteError(w, http.StatusNotFound, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, info)
}
