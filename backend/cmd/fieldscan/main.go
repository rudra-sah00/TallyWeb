package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/rudra/tallyweb-backend/internal/tallydb"
)

// FieldInfo holds stats about a discovered field.
type FieldInfo struct {
	ID      uint16   `json:"id"`
	Hex     string   `json:"hex"`
	Type    string   `json:"type"`
	Count   int      `json:"count"`
	Samples []string `json:"samples"`
}

func main() {
	flag.Parse()
	dir := flag.Arg(0)
	if dir == "" {
		fmt.Fprintf(os.Stderr, "usage: fieldscan <company_data_dir>\n")
		os.Exit(1)
	}

	files, _ := filepath.Glob(filepath.Join(dir, "*.1800"))
	files2, _ := filepath.Glob(filepath.Join(dir, "*.900"))
	files = append(files, files2...)

	for _, path := range files {
		name := filepath.Base(path)
		pages, err := tallydb.ReadFile(path)
		if err != nil {
			continue
		}
		if len(pages) < 2 {
			continue
		}

		// Collect field stats
		fields := make(map[uint16]*FieldInfo)
		for _, page := range pages {
			for _, f := range page.Fields {
				info, ok := fields[f.ID]
				if !ok {
					info = &FieldInfo{ID: f.ID, Hex: fmt.Sprintf("0x%04X", f.ID)}
					fields[f.ID] = info
				}
				info.Count++
				var sample string
				switch f.Type {
				case 'S':
					info.Type = "string"
					sample = f.Str
				case 'I':
					info.Type = "int32"
					sample = fmt.Sprintf("%d", f.Int32)
				case 'L':
					info.Type = "int64"
					sample = fmt.Sprintf("Rs.%.2f", float64(f.Int64)/100000)
				case 'D':
					info.Type = "date"
					sample = fmt.Sprintf("days=%d", f.Int32)
				}
				if sample != "" && len(info.Samples) < 3 {
					dup := false
					for _, s := range info.Samples {
						if s == sample { dup = true; break }
					}
					if !dup && len(sample) <= 60 {
						info.Samples = append(info.Samples, sample)
					}
				}
			}
		}

		if len(fields) == 0 {
			continue
		}

		// Sort by count
		var sorted []*FieldInfo
		for _, f := range fields {
			sorted = append(sorted, f)
		}
		sort.Slice(sorted, func(i, j int) bool { return sorted[i].Count > sorted[j].Count })

		fmt.Fprintf(os.Stderr, "\n=== %s (%d pages, %d unique fields) ===\n", name, len(pages), len(sorted))
		out, _ := json.MarshalIndent(sorted, "", "  ")
		fmt.Printf("{\"%s\": %s}\n", name, string(out))
	}
}
