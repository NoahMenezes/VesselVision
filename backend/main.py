"""FastAPI entrypoint (Phase 7: full route set; model routes 503 until trained)."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.config import FRONTEND_URL
from app.predict import load_artifacts
from app.schemas import HealthResponse


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_artifacts()  # never raises; records missing models for 503s
    yield


app = FastAPI(title="VesselVision API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.perf_counter() - started:.3f}s"
    return response


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


app.include_router(router)
