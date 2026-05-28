package handler

import (
	"encoding/json"
	"net/http"
)

type StockHandler struct{ Base }

func (h *StockHandler) ListItems(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	masters, err := h.DB.GetMasters(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, masters.StockItems)
}

func (h *StockHandler) CreateItem(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Template string `json:"template"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || req.Template == "" {
		WriteError(w, http.StatusBadRequest, "name and template required")
		return
	}
	folder := h.CompanyFolder(r)
	seq, err := h.DB.CreateStockItem(folder, req.Template, req.Name)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]any{"name": req.Name, "seq": seq})
}
