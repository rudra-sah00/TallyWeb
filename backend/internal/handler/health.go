package handler

import "net/http"

type HealthHandler struct{ Base }

func (h *HealthHandler) Get(w http.ResponseWriter, r *http.Request) {
	WriteJSON(w, http.StatusOK, map[string]any{
		"status":    "ok",
		"mode":      "file",
		"companies": len(h.DB.Companies),
	})
}
