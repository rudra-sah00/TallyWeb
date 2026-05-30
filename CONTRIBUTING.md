# Contributing to TallyWeb

Thank you for your interest in contributing! This guide will help you get started.

## Repository Structure

This is a **monorepo** — all services live in one repository:

| Folder | Description |
|--------|-------------|
| `backend/` | Go REST API (Tally XML proxy) |
| `frontend/` | Next.js 15 web dashboard |
| `docs/` | Documentation (planned) |

## Development Setup

### Prerequisites

- [Go 1.23+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/)
- TallyPrime running with XML Server enabled on port 9000

### Getting Started

```bash
git clone https://github.com/rudra-sah00/TallyWeb.git
cd TallyWeb
make install   # Install frontend dependencies
make dev       # Start backend + frontend
```

## Branch Naming

- `feat/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation changes
- `refactor/description` — Code refactoring

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add ledger export to CSV
fix: handle empty XML response from Tally
docs: update API reference
refactor: extract pagination hook
```

## Pull Request Process

1. Fork the repository
2. Create your feature branch from `main`
3. Make your changes
4. Test both backend and frontend build: `make build`
5. Open a PR with a clear description of changes

## Code Style

### Backend (Go)
- Follow standard `gofmt` formatting
- Keep handlers thin — business logic goes in the `tally/` or `model/` packages
- No external dependencies beyond `gopkg.in/yaml.v3`

### Frontend (TypeScript)
- Follow the existing component patterns
- Use CSS variables from `globals.css` for theming
- Prefer `glass-card` and utility classes over inline styles
- Use `sonner` for toast notifications

## Need Help?

Open an [issue](https://github.com/rudra-sah00/TallyWeb/issues) or start a [discussion](https://github.com/rudra-sah00/TallyWeb/discussions).
