package handler

import (
	"encoding/json"
	"net/http"

	"github.com/rudra/tallyweb-backend/internal/tallydb"
)

// Base provides shared state for all handlers.
type Base struct {
	DB             *tallydb.DB
	DefaultCompany string // Default company folder name
}

// CompanyFolder returns the company folder to use for this request.
func (b *Base) CompanyFolder(r *http.Request) string {
	if c := r.URL.Query().Get("company"); c != "" {
		// Try to match by folder name or company name
		for _, folder := range b.DB.Companies {
			if folder == c {
				return folder
			}
		}
		// Try matching by company display name
		for _, folder := range b.DB.Companies {
			info, _ := b.DB.GetCompanyInfo(folder)
			if info != nil && info.Name == c {
				return folder
			}
		}
	}
	return b.DefaultCompany
}

func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func WriteError(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, map[string]string{"error": msg})
}
