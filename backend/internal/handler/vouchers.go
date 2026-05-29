package handler

import (
	"net/http"

	"github.com/rudra/tallyweb-backend/internal/tallydb"
)

type VoucherHandler struct{ Base }

func (h *VoucherHandler) List(w http.ResponseWriter, r *http.Request) {
	folder := h.CompanyFolder(r)
	vtype := r.URL.Query().Get("type")
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	party := r.URL.Query().Get("party")

	vouchers, err := h.DB.GetVouchersByType(folder, vtype)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	// Apply date filter (DD-MM-YYYY format)
	if from != "" || to != "" {
		var filtered []tallydb.Voucher
		for _, v := range vouchers {
			d := v.Date
			if len(d) != 10 { continue }
			sortable := d[6:10] + d[3:5] + d[0:2] // YYYYMMDD
			if from != "" && len(from) == 10 {
				fromS := from[6:10] + from[3:5] + from[0:2]
				if sortable < fromS { continue }
			}
			if to != "" && len(to) == 10 {
				toS := to[6:10] + to[3:5] + to[0:2]
				if sortable > toS { continue }
			}
			filtered = append(filtered, v)
		}
		vouchers = filtered
	}
	// Apply party filter
	if party != "" {
		var filtered []tallydb.Voucher
		for _, v := range vouchers {
			if v.Party == party { filtered = append(filtered, v) }
		}
		vouchers = filtered
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

	// Get opening balance for this party
	masters, _ := h.DB.GetMasters(folder)
	ob := 0.0
	if masters != nil {
		for _, l := range masters.Ledgers {
			if l.Name == party {
				ob = l.OpeningBal
				break
			}
		}
	}

	// Compute closing balance (OB + transactions)
	closing := ob
	for _, v := range vouchers {
		if v.Type == "Sales" {
			closing -= v.Amount // debit to party (negative in Tally convention)
		} else {
			closing += v.Amount
		}
	}

	WriteJSON(w, http.StatusOK, map[string]any{
		"party":           party,
		"opening_balance": ob,
		"closing_balance": closing,
		"vouchers":        vouchers,
	})
}
