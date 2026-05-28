package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Roles
const (
	RoleOwner        = "owner"
	RoleManager      = "manager"
	RoleAccountant   = "accountant"
	RoleSalesperson  = "salesperson"
	RoleStoreManager = "store_manager"
	RoleAuditor      = "auditor"
)

// Permission defines what each role can access.
var Permissions = map[string][]string{
	RoleOwner:        {"*"},
	RoleManager:      {"dashboard", "ledgers", "vouchers", "groups", "stock-items", "units", "reports", "users.list"},
	RoleAccountant:   {"dashboard", "ledgers", "vouchers", "groups", "units", "reports"},
	RoleSalesperson:  {"dashboard", "vouchers", "ledgers"},
	RoleStoreManager: {"dashboard", "stock-items", "units", "vouchers"},
	RoleAuditor:      {"dashboard", "ledgers", "vouchers", "groups", "stock-items", "units", "reports"},
}

// User from the database.
type User struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	Name     string `json:"name"`
	Company  string `json:"company,omitempty"`
}

// Store manages users in Postgres.
type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) (*Store, error) {
	s := &Store{pool: pool}
	if err := s.migrate(); err != nil {
		return nil, err
	}
	// Seed default admin if no users exist
	var count int
	s.pool.QueryRow(context.Background(), "SELECT COUNT(*) FROM users").Scan(&count)
	if count == 0 {
		s.CreateUser("admin", "admin", RoleOwner, "Admin", "")
	}
	return s, nil
}

func (s *Store) migrate() error {
	_, err := s.pool.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			pass_hash TEXT NOT NULL,
			salt TEXT NOT NULL,
			role TEXT NOT NULL,
			name TEXT DEFAULT '',
			company TEXT DEFAULT '',
			created_at TIMESTAMP DEFAULT NOW()
		)
	`)
	return err
}

func (s *Store) Authenticate(username, password string) (*User, error) {
	var u User
	var passHash, salt string
	err := s.pool.QueryRow(context.Background(),
		"SELECT id, username, pass_hash, salt, role, name, company FROM users WHERE username=$1",
		username).Scan(&u.ID, &u.Username, &passHash, &salt, &u.Role, &u.Name, &u.Company)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}
	if hashPassword(password, salt) != passHash {
		return nil, fmt.Errorf("invalid credentials")
	}
	return &u, nil
}

func (s *Store) CreateUser(username, password, role, name, company string) error {
	salt := randomHex(16)
	_, err := s.pool.Exec(context.Background(),
		"INSERT INTO users (username, pass_hash, salt, role, name, company) VALUES ($1,$2,$3,$4,$5,$6)",
		username, hashPassword(password, salt), salt, role, name, company)
	return err
}

func (s *Store) ListUsers() ([]User, error) {
	rows, err := s.pool.Query(context.Background(),
		"SELECT id, username, role, name, company FROM users ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var users []User
	for rows.Next() {
		var u User
		rows.Scan(&u.ID, &u.Username, &u.Role, &u.Name, &u.Company)
		users = append(users, u)
	}
	return users, nil
}

func (s *Store) DeleteUser(username string) error {
	_, err := s.pool.Exec(context.Background(), "DELETE FROM users WHERE username=$1", username)
	return err
}

// --- JWT ---

var jwtSecret []byte

func InitJWT(secret string) {
	if secret == "" {
		secret = randomHex(32)
	}
	jwtSecret = []byte(secret)
}

type Claims struct {
	UserID   int    `json:"uid"`
	Username string `json:"sub"`
	Role     string `json:"role"`
	Company  string `json:"company,omitempty"`
	Exp      int64  `json:"exp"`
}

func GenerateToken(user *User) (string, error) {
	claims := Claims{
		UserID:   user.ID,
		Username: user.Username,
		Role:     user.Role,
		Company:  user.Company,
		Exp:      time.Now().Add(24 * time.Hour).Unix(),
	}
	header := b64Encode([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payload, _ := json.Marshal(claims)
	payloadEnc := b64Encode(payload)
	sig := sign(header + "." + payloadEnc)
	return header + "." + payloadEnc + "." + sig, nil
}

func ValidateToken(token string) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token")
	}
	if sign(parts[0]+"."+parts[1]) != parts[2] {
		return nil, fmt.Errorf("invalid signature")
	}
	payload, err := b64Decode(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid payload")
	}
	var claims Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, err
	}
	if time.Now().Unix() > claims.Exp {
		return nil, fmt.Errorf("token expired")
	}
	return &claims, nil
}

// HasPermission checks if a role can access a resource.
func HasPermission(role, resource string) bool {
	perms := Permissions[role]
	for _, p := range perms {
		if p == "*" || p == resource {
			return true
		}
	}
	return false
}

// --- Helpers ---

func sign(data string) string {
	mac := hmac.New(sha256.New, jwtSecret)
	mac.Write([]byte(data))
	return b64Encode(mac.Sum(nil))
}

func b64Encode(b []byte) string  { return base64.RawURLEncoding.EncodeToString(b) }
func b64Decode(s string) ([]byte, error) { return base64.RawURLEncoding.DecodeString(s) }

func hashPassword(password, salt string) string {
	h := sha256.Sum256([]byte(password + salt))
	return hex.EncodeToString(h[:])
}

func randomHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}
