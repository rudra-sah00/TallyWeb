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
	Name      string `json:"name"`
	Folder    string `json:"folder,omitempty"`
	Email     string `json:"email,omitempty"`
	Phone     string `json:"phone,omitempty"`
	Mobile    string `json:"mobile,omitempty"`
	Fax       string `json:"fax,omitempty"`
	Website   string `json:"website,omitempty"`
	State     string `json:"state,omitempty"`
	Country   string `json:"country,omitempty"`
	Pincode   string `json:"pincode,omitempty"`
	GSTIN     string `json:"gstin,omitempty"`
	PAN       string `json:"pan,omitempty"`
	Address   string `json:"address,omitempty"`
	BooksFrom string `json:"books_from,omitempty"`
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
			case FldCompanyName:
				c.Name = f.Str
			case 0x001B: // display name (fallback)
				if c.Name == "" {
					c.Name = f.Str
				}
			case 0x0009: // email
				if c.Email == "" {
					c.Email = f.Str
				}
			case 0x0006: // phone
				if c.Phone == "" {
					c.Phone = f.Str
				}
			case 0x0008: // mobile
				if c.Mobile == "" {
					c.Mobile = f.Str
				}
			case 0x0007: // fax
				if c.Fax == "" {
					c.Fax = f.Str
				}
			case 0x000A: // website
				if c.Website == "" {
					c.Website = f.Str
				}
			case 0x0067, FldGSTState: // state
				if c.State == "" && len(f.Str) > 2 {
					c.State = f.Str
				}
			case 0x00D2, FldCountry: // country
				if c.Country == "" && len(f.Str) > 2 {
					c.Country = f.Str
				}
			case 0x0C82, FldGSTIN: // GSTIN
				if c.GSTIN == "" {
					c.GSTIN = f.Str
				}
			case FldPAN:
				c.PAN = f.Str
			case FldPin:
				if c.Pincode == "" {
					c.Pincode = f.Str
				}
			case FldAddr: // 0x0003
				if c.Address == "" {
					c.Address = f.Str
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
