from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import signals, backtest, ai_analysis, ws_prices
from core.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"🚀  Forex Signal Engine API starting [{settings.app_env}]")
    yield
    print("🛑  Shutting down")


app = FastAPI(
    title="Forex Signal Engine API",
    description="ICT + Classic TA signal engine with backtest and AI analysis",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS — allow your React dev server and production domain ───────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",   # Vite dev (current)
        "http://localhost:5173",   # Vite dev (default)
        "http://localhost:3000",
        "https://your-app.vercel.app",   # change this before deploying
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(signals.router)
app.include_router(backtest.router)
app.include_router(ai_analysis.router)
app.include_router(ws_prices.router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "env": settings.app_env,
        "twelve_data_key_set": bool(settings.twelve_data_api_key),
        "anthropic_key_set": bool(settings.anthropic_api_key),
    }
