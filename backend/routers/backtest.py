from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from data.twelve_data import fetch_ohlcv, PAIRS
from engine.backtest_engine import run_backtest
from core.cache import cache_get, cache_set

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


class BacktestRequest(BaseModel):
    symbol: str = Field(..., example="EUR/USD")
    interval: str = Field("1h", example="1h")
    outputsize: int = Field(500, ge=100, le=5000)
    risk_pct: float = Field(1.0, ge=0.1, le=5.0)
    initial_balance: float = Field(10000.0, ge=100)
    min_confidence: int = Field(60, ge=40, le=100)


@router.post("")
async def run_backtest_endpoint(req: BacktestRequest):
    """
    Run walk-forward backtest for a given pair and interval.
    Fetches up to `outputsize` candles from Twelve Data.
    """
    pair = req.symbol.upper().replace("-", "/")
    if pair not in PAIRS:
        raise HTTPException(status_code=400, detail=f"Unknown pair: {pair}")

    cache_key = f"backtest:{pair}:{req.interval}:{req.outputsize}:{req.min_confidence}"
    cached = await cache_get(cache_key)
    if cached:
        return {"source": "cache", "result": cached}

    try:
        candles = await fetch_ohlcv(pair, interval=req.interval, outputsize=req.outputsize)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Data fetch error: {e}")

    if len(candles) < 80:
        raise HTTPException(status_code=422, detail="Not enough candles for backtest (need ≥ 80)")

    try:
        stats = run_backtest(
            symbol=pair,
            candles=candles,
            interval=req.interval,
            risk_pct=req.risk_pct,
            initial_balance=req.initial_balance,
            min_confidence=req.min_confidence,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest error: {e}")

    result = stats.to_dict()
    # Cache for 5 minutes — backtest is expensive
    await cache_set(cache_key, result, ttl=300)
    return {"source": "live", "result": result}
