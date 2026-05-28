package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rudra/tallyweb-backend/internal/auth"
	"github.com/rudra/tallyweb-backend/internal/config"
	"github.com/rudra/tallyweb-backend/internal/handler"
	"github.com/rudra/tallyweb-backend/internal/middleware"
	"github.com/rudra/tallyweb-backend/internal/tallydb"
)

func main() {
	cfgPath := flag.String("config", "config.yaml", "config file path")
	dataPath := flag.String("data", "", "path to Tally data folder (overrides config)")
	dbURL := flag.String("db", "postgres://tallyweb:tallyweb@localhost:5432/tallyweb", "postgres connection URL")
	jwtSecret := flag.String("jwt-secret", "", "JWT signing secret (random if empty)")
	flag.Parse()

	cfg, err := config.Load(*cfgPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	// Postgres
	pool, err := pgxpool.New(context.Background(), *dbURL)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatalf("ping postgres: %v", err)
	}
	log.Printf("Connected to PostgreSQL")

	// Auth
	auth.InitJWT(*jwtSecret)
	authStore, err := auth.NewStore(pool)
	if err != nil {
		log.Fatalf("init auth: %v", err)
	}
	log.Printf("Auth ready (default: admin/admin)")

	// Tally data
	dp := *dataPath
	if dp == "" {
		dp = cfg.DataPath
	}
	if dp == "" {
		dp, err = tallydb.FindDataPath()
		if err != nil {
			log.Fatalf("Cannot find Tally data: %v\nUse -data flag or set data_path in config.yaml", err)
		}
	}

	db, err := tallydb.Open(dp)
	if err != nil {
		log.Fatalf("open tally data: %v", err)
	}
	log.Printf("Tally data: %s (%d companies)", dp, len(db.Companies))
	for _, folder := range db.Companies {
		info, _ := db.GetCompanyInfo(folder)
		name := folder
		if info != nil && info.Name != "" {
			name = info.Name
		}
		log.Printf("  [%s] %s", folder, name)
	}

	defaultFolder := db.Companies[0]
	if cfg.DefaultCompany != "" {
		for _, f := range db.Companies {
			info, _ := db.GetCompanyInfo(f)
			if info != nil && info.Name == cfg.DefaultCompany {
				defaultFolder = f
				break
			}
		}
	}

	// Handlers
	base := handler.Base{DB: db, DefaultCompany: defaultFolder}
	authH := &handler.AuthHandler{Store: authStore}
	health := &handler.HealthHandler{Base: base}
	companies := &handler.CompanyHandler{Base: base}
	ledgers := &handler.LedgerHandler{Base: base}
	groups := &handler.GroupHandler{Base: base}
	stock := &handler.StockHandler{Base: base}
	vouchers := &handler.VoucherHandler{Base: base}
	dashboard := &handler.DashboardHandler{Base: base}
	units := &handler.UnitHandler{Base: base}
	reports := &handler.ReportHandler{Base: base}
	banking := &handler.BankingHandler{Base: base}
	godowns := &handler.GodownHandler{Base: base}
	employees := &handler.EmployeeHandler{Base: base}

	mux := http.NewServeMux()

	// Public routes (no auth)
	mux.HandleFunc("POST /api/auth/login", authH.Login)
	mux.HandleFunc("GET /api/health", health.Get)

	// Protected routes (auth + RBAC)
	protected := http.NewServeMux()
	protected.HandleFunc("GET /api/companies", middleware.RBAC("dashboard", companies.List))
	protected.HandleFunc("GET /api/company/{name}", middleware.RBAC("dashboard", companies.Details))
	protected.HandleFunc("GET /api/dashboard/overview", middleware.RBAC("dashboard", dashboard.Overview))
	protected.HandleFunc("GET /api/ledgers", middleware.RBAC("ledgers", ledgers.List))
	protected.HandleFunc("POST /api/ledgers", middleware.RBAC("ledgers", ledgers.Create))
	protected.HandleFunc("GET /api/ledgers/{name}/vouchers", middleware.RBAC("vouchers", vouchers.ByParty))
	protected.HandleFunc("GET /api/groups", middleware.RBAC("groups", groups.List))
	protected.HandleFunc("POST /api/groups", middleware.RBAC("groups", groups.Create))
	protected.HandleFunc("GET /api/stock-items", middleware.RBAC("stock-items", stock.ListItems))
	protected.HandleFunc("POST /api/stock-items", middleware.RBAC("stock-items", stock.CreateItem))
	protected.HandleFunc("GET /api/units", middleware.RBAC("units", units.List))
	protected.HandleFunc("GET /api/godowns", middleware.RBAC("stock-items", godowns.List))
	protected.HandleFunc("GET /api/employees", middleware.RBAC("reports", employees.List))
	protected.HandleFunc("GET /api/vouchers", middleware.RBAC("vouchers", vouchers.List))
	protected.HandleFunc("GET /api/reports/trial-balance", middleware.RBAC("reports", reports.TrialBalance))
	protected.HandleFunc("GET /api/reports/profit-loss", middleware.RBAC("reports", reports.ProfitLoss))
	protected.HandleFunc("GET /api/reports/gstr-1", middleware.RBAC("reports", reports.GSTR1))
	protected.HandleFunc("GET /api/reports/gst-returns", middleware.RBAC("reports", reports.GSTReturns))
	protected.HandleFunc("GET /api/reports/ledger-balances", middleware.RBAC("reports", reports.LedgerBalances))
	protected.HandleFunc("GET /api/reports/outstanding", middleware.RBAC("reports", reports.Outstanding))
	protected.HandleFunc("GET /api/reports/stock-balance", middleware.RBAC("reports", reports.StockBalance))
	protected.HandleFunc("GET /api/banking/transactions", middleware.RBAC("reports", banking.List))
	protected.HandleFunc("GET /api/auth/users", middleware.RBAC("users.list", authH.ListUsers))
	protected.HandleFunc("POST /api/auth/users", authH.CreateUser)
	protected.HandleFunc("DELETE /api/auth/users/{username}", authH.DeleteUser)

	// Mount protected under auth middleware
	mux.Handle("/api/", middleware.Auth(protected))

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("TallyWeb starting on %s", addr)

	srv := middleware.CORS(cfg.Server.CORSOrigins, mux)
	if err := http.ListenAndServe(addr, srv); err != nil {
		fmt.Fprintf(os.Stderr, "server error: %v\n", err)
		os.Exit(1)
	}
}
