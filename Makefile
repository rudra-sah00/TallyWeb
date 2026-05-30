.PHONY: dev backend frontend install build clean

# Run both backend + frontend in parallel
dev:
	@echo "Starting TallyWeb (backend :8080 + frontend :3000)..."
	@make -j2 backend frontend

backend:
	cd backend && make run

frontend:
	cd frontend && npm run dev

install:
	cd frontend && npm install

build:
	cd backend && make build
	cd frontend && npm run build

clean:
	cd backend && make clean
	rm -rf frontend/.next frontend/node_modules
