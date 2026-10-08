# VesselVision backend. Artifacts + data are mounted at runtime
# (Phase 5 writes backend/artifacts/*.joblib; data/ holds the public CSV).
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /srv
COPY pyproject.toml uv.lock ./
# Slow networks hit uv's 30s default on big wheels (scipy, nvidia-nccl).
ENV UV_HTTP_TIMEOUT=600
RUN uv sync --frozen --no-dev
COPY app ./app
COPY main.py ./

ENV ARTIFACTS_DIR=/srv/artifacts \
    DATA_DIR=/srv/data

EXPOSE 8000
# Use the frozen image venv directly: `uv run` would re-sync dev packages
# (jupyter, ruff, ...) at every container start.
CMD ["./.venv/bin/uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
