package tallydb

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Company holds details from Company.1800/.900.
type Company struct {
	Name        string   `json:"name"`
	Folder      string   `json:"folder,omitempty"`
	Address     []string `json:"address,omitempty"`
	Email       string   `json:"email,omitempty"`
	Phone       string   `json:"phone,omitempty"`
	State       string   `json:"state,omitempty"`
	Country     string   `json:"country,omitempty"`
	Pincode     string   `json:"pincode,omitempty"`
	GSTIN       string   `json:"gstin,omitempty"`
	PAN         string   `json:"pan,omitempty"`
	Proprietor  string   `json:"proprietor,omitempty"`
	Designation string   `json:"designation,omitempty"`
	FirmName    string   `json:"firm_name,omitempty"`
}

// DB is the main interface to read Tally data from files.
type DB struct {
	DataPath  string   // Root data path (contains company folders)
	Companies []string // List of company folder names
}

// Open locates the Tally data folder and lists available companies.
func Open(dataPath string) (*DB, error) {
	entries, err := os.ReadDir(dataPath)
	if err != nil {
		return nil, fmt.Errorf("open data dir: %w", err)
	}

	db := &DB{DataPath: dataPath}
	for _, e := range entries {
		if e.IsDir() {
			dir := filepath.Join(dataPath, e.Name())
			if hasManagerFile(dir) {
				db.Companies = append(db.Companies, e.Name())
			}
		}
	}
	if len(db.Companies) == 0 {
		return nil, fmt.Errorf("no company data found in %s", dataPath)
	}
	return db, nil
}

// CompanyDir returns the full path to a company's data folder.
func (db *DB) CompanyDir(folderName string) string {
	return filepath.Join(db.DataPath, folderName)
}

// GetCompanyInfo reads Company.1800/.900 for a given company folder.
func (db *DB) GetCompanyInfo(folderName string) (*Company, error) {
	path := ResolveFile(filepath.Join(db.DataPath, folderName), "Company")
	if path == "" {
		return &Company{Name: folderName}, nil
	}
	pages, err := ReadFile(path)
	if err != nil {
		return nil, err
	}

	c := &Company{Folder: folderName}
	for _, page := range pages {
		for _, f := range page.Fields {
			if f.Type != 'S' {
				continue
			}
			switch f.ID {
			case 0x001B: // Company name
				if c.Name == "" {
					c.Name = f.Str
				}
			case 0x001D: // Address lines
				c.Address = append(c.Address, f.Str)
			case 0x0066: // Email
				if c.Email == "" {
					c.Email = f.Str
				}
			case 0x0067: // State
				if c.State == "" {
					c.State = f.Str
				}
			case 0x0068: // Pincode
				if c.Pincode == "" {
					c.Pincode = f.Str
				}
			case 0x00CA: // PAN
				if c.PAN == "" {
					c.PAN = f.Str
				}
			case 0x00D2: // Country
				if c.Country == "" {
					c.Country = f.Str
				}
			case 0x09C8: // Phone
				if c.Phone == "" {
					c.Phone = f.Str
				}
			case 0x0284: // Proprietor name
				if c.Proprietor == "" {
					c.Proprietor = f.Str
				}
			case 0x0286: // Designation
				if c.Designation == "" {
					c.Designation = f.Str
				}
			case 0x026F: // Firm name
				if c.FirmName == "" {
					c.FirmName = f.Str
				}
			case 0x0C82, FldGSTIN: // GSTIN
				if c.GSTIN == "" && len(f.Str) == 15 {
					c.GSTIN = f.Str
				}
			}
		}
	}
	return c, nil
}

// ListCompanies returns company info for all detected companies.
func (db *DB) ListCompanies() []Company {
	var companies []Company
	for _, folder := range db.Companies {
		info, err := db.GetCompanyInfo(folder)
		if err != nil || info.Name == "" {
			companies = append(companies, Company{Name: folder})
		} else {
			companies = append(companies, *info)
		}
	}
	return companies
}

// GetMasters reads all masters for a company folder.
func (db *DB) GetMasters(folderName string) (*Masters, error) {
	return ParseMasters(db.CompanyDir(folderName))
}

// GetVouchers reads all vouchers for a company folder.
// CreateLedger writes a new ledger to the company's Manager.1800 file.
func (db *DB) CreateLedger(folderName, templateName, newName string) (uint32, error) {
	return db.createMaster(folderName, templateName, newName)
}

// CreateStockItem writes a new stock item to Manager.1800.
func (db *DB) CreateStockItem(folderName, templateName, newName string) (uint32, error) {
	return db.createMaster(folderName, templateName, newName)
}

// CreateGroup writes a new group to Manager.1800.
func (db *DB) CreateGroup(folderName, templateName, newName string) (uint32, error) {
	return db.createMaster(folderName, templateName, newName)
}

func (db *DB) createMaster(folderName, templateName, newName string) (uint32, error) {
	managerPath := ResolveFile(filepath.Join(db.DataPath, folderName), "Manager")
	if managerPath == "" {
		return 0, fmt.Errorf("Manager.1800 not found for company %s", folderName)
	}
	w, err := OpenWriter(managerPath)
	if err != nil {
		return 0, err
	}
	seq, err := w.writeMaster(templateName, newName)
	if err != nil {
		return 0, err
	}
	if err := w.Save(); err != nil {
		return 0, err
	}
	DeleteIndexFiles(filepath.Join(db.DataPath, folderName))
	return seq, nil
}

func (db *DB) GetVouchers(folderName string) ([]Voucher, error) {
	return ParseVouchers(db.CompanyDir(folderName))
}

// GetBankEntries returns banking transactions from LinkMgr.
func (db *DB) GetBankEntries(folderName string) ([]BankEntry, error) {
	return ParseBankEntries(db.CompanyDir(folderName))
}

// GetGSTReturns returns pre-computed GST data from Aggr.1800.
func (db *DB) GetGSTReturns(folderName string) ([]GSTReturn, error) {
	return ParseGSTReturns(db.CompanyDir(folderName))
}

// GetUnits returns all measurement units.
func (db *DB) GetUnits(folderName string) ([]Unit, error) {
	m, err := db.GetMasters(folderName)
	if err != nil {
		return nil, err
	}
	return m.Units, nil
}

// GetVouchersByType filters vouchers by type.
func (db *DB) GetVouchersByType(folderName, vtype string) ([]Voucher, error) {
	all, err := db.GetVouchers(folderName)
	if err != nil {
		return nil, err
	}
	if vtype == "" {
		return all, nil
	}
	var filtered []Voucher
	for _, v := range all {
		if strings.EqualFold(v.Type, vtype) {
			filtered = append(filtered, v)
		}
	}
	return filtered, nil
}

// GetVouchersByParty returns all vouchers for a given party/ledger.
func (db *DB) GetVouchersByParty(folderName, party string) []Voucher {
	all, err := db.GetVouchers(folderName)
	if err != nil {
		return nil
	}
	var result []Voucher
	for _, v := range all {
		if strings.EqualFold(v.Party, party) {
			result = append(result, v)
		}
	}
	return result
}

// TrialBalance returns debit/credit totals per party.
type TrialBalanceEntry struct {
	Ledger string  `json:"ledger"`
	Debit  float64 `json:"debit"`
	Credit float64 `json:"credit"`
}

func (db *DB) GetTrialBalance(folderName string) ([]TrialBalanceEntry, error) {
	vouchers, err := db.GetVouchers(folderName)
	if err != nil {
		return nil, err
	}
	balances := make(map[string]*TrialBalanceEntry)
	for _, v := range vouchers {
		if v.Party == "" || v.Amount == 0 {
			continue
		}
		e, ok := balances[v.Party]
		if !ok {
			e = &TrialBalanceEntry{Ledger: v.Party}
			balances[v.Party] = e
		}
		e.Debit += v.Amount
	}
	var result []TrialBalanceEntry
	for _, e := range balances {
		result = append(result, *e)
	}
	return result, nil
}

// GSTEntry is a GST summary line.
type GSTEntry struct {
	HSN       string  `json:"hsn"`
	Rate      float64 `json:"gst_rate"`
	Taxable   float64 `json:"taxable_value"`
	CGST      float64 `json:"cgst"`
	SGST      float64 `json:"sgst"`
	IGST      float64 `json:"igst"`
	ItemCount int     `json:"item_count"`
}

func (db *DB) GetGSTR1Summary(folderName string) ([]GSTEntry, error) {
	vouchers, err := db.GetVouchers(folderName)
	if err != nil {
		return nil, err
	}
	type key struct{ hsn string; rate float64 }
	agg := make(map[key]*GSTEntry)
	for _, v := range vouchers {
		for _, item := range v.Items {
			if item.HSN == "" || item.Amount == 0 {
				continue
			}
			// Validate HSN: must be numeric 4-8 digits
			if len(item.HSN) < 4 || len(item.HSN) > 8 {
				continue
			}
			isNumeric := true
			for _, c := range item.HSN {
				if c < '0' || c > '9' { isNumeric = false; break }
			}
			if !isNumeric {
				continue
			}
			// Validate GST rate: must be 0, 5, 12, 18, or 28
			rate := item.GSTRate
			if rate != 0 && rate != 5 && rate != 12 && rate != 18 && rate != 28 && rate != 9 && rate != 14 && rate != 6 {
				continue
			}
			k := key{item.HSN, rate}
			e, ok := agg[k]
			if !ok {
				e = &GSTEntry{HSN: item.HSN, Rate: rate}
				agg[k] = e
			}
			e.Taxable += item.Amount
			tax := item.Amount * rate / 100
			if v.State == "Odisha" {
				e.CGST += tax / 2
				e.SGST += tax / 2
			} else {
				e.IGST += tax
			}
			e.ItemCount++
		}
	}
	var result []GSTEntry
	for _, e := range agg {
		result = append(result, *e)
	}
	return result, nil
}

// FindDataPath auto-detects the Tally data path from tally.ini.
// Searches common locations for tally.ini and reads the Data= line.
func FindDataPath() (string, error) {
	// Common tally.ini locations on Windows
	candidates := []string{
		`C:\Program Files\TallyPrime\tally.ini`,
		`C:\TallyPrime\tally.ini`,
		`E:\Temp_tally\tally.ini`,
		`D:\TallyPrime\tally.ini`,
	}

	for _, iniPath := range candidates {
		if dp := readDataPathFromIni(iniPath); dp != "" {
			return dp, nil
		}
	}
	return "", fmt.Errorf("tally.ini not found in common locations")
}

func readDataPathFromIni(iniPath string) string {
	f, err := os.Open(iniPath)
	if err != nil {
		return ""
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "Data=") {
			return strings.TrimPrefix(line, "Data=")
		}
	}
	return ""
}

// hasManagerFile checks if a directory contains Manager.1800 or Manager.900.
func hasManagerFile(dir string) bool {
	for _, ext := range []string{".1800", ".900"} {
		if _, err := os.Stat(filepath.Join(dir, "Manager"+ext)); err == nil {
			return true
		}
	}
	return false
}

// ResolveFile finds a file with either .1800 or .900 extension.
func ResolveFile(dir, baseName string) string {
	for _, ext := range []string{".1800", ".900"} {
		p := filepath.Join(dir, baseName+ext)
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}
