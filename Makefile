# VesselVision one-line commands.
# Backend commands run from backend/ (uv). Frontend commands run from frontend/ (bun).

backend:  ## run FastAPI on :8000
	cd backend && uv run uvicorn main:app --port 8000 --reload

frontend:  ## run Next.js on :3000
	cd frontend && bun run dev

train:  ## regenerate all artifacts + metrics + figures (Phases 4-5)
	cd backend && uv run python -m app.train

test:  ## backend smoke tests + frontend typecheck/lint/tests
	cd backend && uv run pytest -q
	cd frontend && bunx tsc --noEmit && bun run lint && bun run test

lint:  ## backend ruff check + format check
	cd backend && uv run ruff check app main.py tests && uv run ruff format --check app main.py tests
