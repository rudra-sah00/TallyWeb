package handler

import (
	"encoding/json"
	"net/http"

	"github.com/rudra/tallyweb-backend/internal/auth"
	"github.com/rudra/tallyweb-backend/internal/middleware"
)

type AuthHandler struct {
	Store *auth.Store
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	user, err := h.Store.Authenticate(req.Username, req.Password)
	if err != nil {
		WriteError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	token, err := auth.GenerateToken(user)
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "token generation failed")
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{
		"token": token,
		"user":  user,
	})
}

func (h *AuthHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	if claims == nil || claims.Role != auth.RoleOwner {
		WriteError(w, http.StatusForbidden, "owner only")
		return
	}
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Role     string `json:"role"`
		Name     string `json:"name"`
		Company  string `json:"company"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, http.StatusBadRequest, "invalid JSON")
		return
	}
	if req.Username == "" || req.Password == "" || req.Role == "" {
		WriteError(w, http.StatusBadRequest, "username, password, role required")
		return
	}
	if err := h.Store.CreateUser(req.Username, req.Password, req.Role, req.Name, req.Company); err != nil {
		WriteError(w, http.StatusConflict, err.Error())
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]string{"status": "created"})
}

func (h *AuthHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.Store.ListUsers()
	if err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, users)
}

func (h *AuthHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r)
	if claims == nil || claims.Role != auth.RoleOwner {
		WriteError(w, http.StatusForbidden, "owner only")
		return
	}
	username := r.PathValue("username")
	if username == "admin" {
		WriteError(w, http.StatusBadRequest, "cannot delete admin")
		return
	}
	if err := h.Store.DeleteUser(username); err != nil {
		WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
