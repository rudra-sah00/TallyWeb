package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/rudra/tallyweb-backend/internal/config"
	"github.com/rudra/tallyweb-backend/internal/handler"
	"github.com/rudra/tallyweb-backend/internal/middleware"
	"github.com/rudra/tallyweb-backend/internal/tallydb"
)

func main() {
	cfgPath := flag.String("config", "config.yaml", "config file path")
	dataPath := flag.String("data", "", "path to Tally data folder (overrides config)")
	flag.Parse()

	cfg, err := config.Load(*cfgPath)
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	// Determine data path: CLI flag > config > auto-detect
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

	// Default company = first one found or from config
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

	base := handler.Base{DB: db, DefaultCompany: defaultFolder}

	health := &handler.HealthHandler{Base: base}
	companies := &handler.CompanyHandler{Base: base}
	ledgers := &handler.LedgerHandler{Base: base}
	groups := &handler.GroupHandler{Base: base}
	stock := &handler.StockHandler{Base: base}
	vouchers := &handler.VoucherHandler{Base: base}
	dashboard := &handler.DashboardHandler{Base: base}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", health.Get)
	mux.HandleFunc("GET /api/companies", companies.List)
	mux.HandleFunc("GET /api/company/{name}", companies.Details)
	mux.HandleFunc("GET /api/dashboard/overview", dashboard.Overview)
	mux.HandleFunc("GET /api/ledgers", ledgers.List)
	mux.HandleFunc("POST /api/ledgers", ledgers.Create)
	mux.HandleFunc("GET /api/groups", groups.List)
	mux.HandleFunc("POST /api/groups", groups.Create)
	mux.HandleFunc("GET /api/stock-items", stock.ListItems)
	mux.HandleFunc("POST /api/stock-items", stock.CreateItem)
	mux.HandleFunc("GET /api/vouchers", vouchers.List)

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("TallyWeb starting on %s (file-based mode)", addr)

	srv := middleware.CORS(cfg.Server.CORSOrigins, mux)
	if err := http.ListenAndServe(addr, srv); err != nil {
		fmt.Fprintf(os.Stderr, "server error: %v\n", err)
		os.Exit(1)
	}
}
