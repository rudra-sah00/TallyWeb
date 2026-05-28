<p align="center">
  <h1 align="center">TallyWeb</h1>
  <p align="center">Modern web dashboard for TallyPrime ERP</p>
</p>

<p align="center">
  <a href="https://github.com/rudra-sah00/TallyWeb/stargazers">
    <img src="https://img.shields.io/github/stars/rudra-sah00/TallyWeb?style=for-the-badge&logo=github&color=6366f1&logoColor=white" alt="Stars">
  </a>
  <a href="https://github.com/rudra-sah00/TallyWeb/network/members">
    <img src="https://img.shields.io/github/forks/rudra-sah00/TallyWeb?style=for-the-badge&logo=github&color=8b5cf6&logoColor=white" alt="Forks">
  </a>
  <a href="https://github.com/rudra-sah00/TallyWeb/issues">
    <img src="https://img.shields.io/github/issues/rudra-sah00/TallyWeb?style=for-the-badge&logo=github&color=22c55e&logoColor=white" alt="Issues">
  </a>
  <a href="https://github.com/rudra-sah00/TallyWeb/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/rudra-sah00/TallyWeb?style=for-the-badge&color=eab308&logoColor=white" alt="License">
  </a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#features">Features</a> •
  <a href="#api-reference">API</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Architecture

TallyWeb is a **monorepo** — all services live in one repository for easy development, consistent tooling, and atomic changes across the stack.

```
TallyWeb/
├── backend/            Go REST API (port 8080)
│   ├── cmd/server/     Application entry point
│   ├── internal/       Private application code
│   │   ├── config/     YAML configuration loader
│   │   ├── handler/    HTTP route handlers
│   │   ├── middleware/ CORS, logging
│   │   ├── model/      Data structures & XML parsing
│   │   └── tally/      Tally XML API client
│   └── config.yaml     Runtime configuration
├── frontend/           Next.js 15 web dashboard (port 3000)
│   └── src/
│       ├── app/        Pages (App Router)
│       ├── components/ Reusable UI components
│       ├── lib/        API client & utilities
│       ├── store/      Zustand state management
│       └── hooks/      Custom React hooks
├── docs/               Documentation (planned)
├── Makefile            Orchestrates all services
├── CONTRIBUTING.md     Contribution guidelines
└── LICENSE             MIT License
```

## Quick Start

```bash
# Clone
git clone https://github.com/rudra-sah00/TallyWeb.git
cd TallyWeb

# Install frontend dependencies
make install

# Run both backend + frontend in parallel
make dev
```

| Service  | URL                    | Description                         |
|----------|------------------------|-------------------------------------|
| Backend  | http://localhost:8080   | Go REST API → Tally XML API proxy   |
| Frontend | http://localhost:3000   | Next.js dashboard                   |

## Features

### Backend (Go)

- **Zero external dependencies** — only `gopkg.in/yaml.v3`
- Go 1.23+ with `net/http` ServeMux (Go 1.22+ pattern matching)
- CORS middleware with configurable origins
- XML sanitization for Tally's control character quirks
- Configurable via `backend/config.yaml`

### Frontend (Next.js 15)

- App Router + Turbopack for fast HMR
- Tailwind CSS v4 with **glass morphism** design system
- Zustand for lightweight state management
- Sonner toast notifications
- Lucide React icons
- Dark theme with indigo accent, glow effects, mesh gradients

### Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Connection status, company stats with glow cards |
| **Masters** | Ledgers, Groups, Stock Items, Units, Godowns, Employees |
| **Vouchers** | Filter by type, create Sales/Purchase/Payment/Receipt/Journal |
| **Reports** | 13 financial reports + ledger statement search |
| **GST** | GSTR-1/2A/3B/9, E-Invoice info, E-Way Bill info |
| **Raw Query** | Direct XML passthrough with preset templates |
| **Settings** | Company switcher, connection test |

## API Reference

### Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Tally connection status |
| GET | `/api/companies` | List all companies |

### Masters (CRUD)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/ledgers` | List & create ledgers |
| PUT/DELETE | `/api/ledgers/{name}` | Update & delete |
| GET/POST | `/api/groups` | Account groups |
| GET/POST | `/api/stock-items` | Stock items |
| GET/POST | `/api/units` | Measurement units |
| GET/POST | `/api/godowns` | Godown/warehouses |
| GET/POST | `/api/employees` | Employee master |

### Vouchers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vouchers` | List (filter: `?type=Sales&from=&to=`) |
| GET | `/api/vouchers/{id}` | Single voucher detail |
| POST | `/api/vouchers` | Create voucher |
| PUT/DELETE | `/api/vouchers/{id}` | Update & delete |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/{report}` | 18 report types |
| GET | `/api/reports/ledger/{name}` | Ledger statement |
| GET | `/api/reports/group/{name}` | Group statement |

Available reports: `balance-sheet`, `profit-loss`, `trial-balance`, `day-book`, `cash-flow`, `funds-flow`, `ratio-analysis`, `bills-receivable`, `bills-payable`, `ageing-analysis`, `stock-summary`, `godown-summary`, `movement-analysis`, `gstr-1`, `gstr-2`, `gstr-3b`

### GST & Compliance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gst/gstr{1,2,3b,9}` | GST returns |
| POST | `/api/einvoice/generate` | Generate e-invoice |
| POST | `/api/einvoice/cancel` | Cancel e-invoice |
| POST | `/api/eway-bill/generate` | Generate e-way bill |
| POST | `/api/eway-bill/cancel` | Cancel e-way bill |

### Banking & Raw

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/banking/reconciliation/{name}` | Bank reconciliation |
| GET | `/api/banking/book/{name}` | Bank book |
| GET | `/api/banking/outstanding/{name}` | Outstanding |
| POST | `/api/raw` | Pass-through XML to Tally |

## Configuration

```yaml
# backend/config.yaml
tally:
  host: "100.84.248.54"     # Tally machine IP (Tailscale)
  port: 9000                # Tally XML API port
  timeout: 30s

server:
  port: 8080
  cors_origins:
    - "http://localhost:3000"
    - "*"

default_company: "M/S. PRAJNA AGENCIES (2025-26)"
```

## Build & Deploy

```bash
make build    # Build both: Go binary + Next.js static
make clean    # Remove all build artifacts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Go 1.23, net/http, gopkg.in/yaml.v3 |
| Frontend | Next.js 15, React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, Glass morphism |
| State | Zustand 5 |
| Icons | Lucide React |
| Toasts | Sonner |
| Target | TallyPrime XML API (port 9000) |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## Star History

<a href="https://star-history.com/#rudra-sah00/TallyWeb&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=rudra-sah00/TallyWeb&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=rudra-sah00/TallyWeb&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=rudra-sah00/TallyWeb&type=Date" />
  </picture>
</a>

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file.

---

<p align="center">
  Made with ❤️ for the Indian accounting community
</p>
