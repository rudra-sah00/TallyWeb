package handler

import (
	"encoding/json"
	"net/http"
)

type LedgerHandler struct{ Base }

func (h *LedgerHandler) List(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	masters, err := h.DB.GetMasters(folder)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, masters.Ledgers)
}

func (h *LedgerHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Template string `json:"template"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Name == "" {
		WriteError(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.Template == "" {
		WriteError(w, http.StatusBadRequest, "template is required (existing ledger name, same char count)")
		return
	}

	folder := h.CompanyFolder(r)
	seq, err := h.DB.CreateLedger(folder, req.Template, req.Name)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	WriteJSON(w, http.StatusCreated, map[string]any{
		"name": req.Name,
		"seq":  seq,
	})
}
