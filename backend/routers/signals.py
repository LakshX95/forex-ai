import asyncio
import time
from fastapi import APIRouter, HTTPException, Query
from data.twelve_data import fetch_ohlcv, PAIRS
from engine.signal_engine import generate_signal
from core.cache import cache_get, cache_set
from core.config import get_settings

router = APIRouter(prefix="/api/signals", tags=["signals"])
settings = get_settings()

# ── In-memory fallback cache (used when Redis is unavailable) ─────────────────
_mem_cache: dict[str, tuple[float, object]] = {}

def _mem_get(key: str):
    entry = _mem_cache.get(key)
    if entry and time.time() < entry[0]:
        return entry[1]
    return None

def _mem_set(key: str, value, ttl: int):
    _mem_cache[key] = (time.time() + ttl, value)

# Twelve Data free tier: 8 credits/min.
# 0.8s delay between 8 pairs = ~6.4s total, safely under the cap.
_FETCH_DELAY = 0.8
_CACHE_TTL   = 120   # 2 minutes — prevents repeat burns on browser refresh


def _price_from_candles(candles: list[dict]) -> float:
    """Use the last candle's close as the current price."""
    return candles[-1]["close"] if candles else 0.0


def _change_pct_from_candles(candles: list[dict]) -> float:
    """Approximate 1-candle % change."""
    if len(candles) < 2:
        return 0.0
    prev = candles[-2]["close"]
    curr = candles[-1]["close"]
    return round((curr - prev) / prev * 100, 4) if prev else 0.0


@router.get("/all")
async def get_all_signals(interval: str = Query("15min", description="Candle interval")):
    """
    Return signals for all 8 major pairs.
    Results cached for SIGNAL_CACHE_TTL seconds.
    Fetches only OHLCV (1 API credit per pair) to stay within free-tier limits.
    """
    cache_key = f"signals:all:{interval}"
    cached = await cache_get(cache_key) or _mem_get(cache_key)
    if cached:
        return {"source": "cache", "signals": cached}

    results = []

    for pair in PAIRS:
        try:
            candles = await fetch_ohlcv(pair, interval=interval, outputsize=100)
            price = _price_from_candles(candles)
            change_pct = _change_pct_from_candles(candles)
            sig = generate_signal(pair, candles, price)
            results.append({**sig.to_dict(), "change_pct": change_pct})
        except Exception as e:
            results.append({
                "symbol": pair,
                "error": str(e),
                "direction": "NEUTRAL",
                "confidence": 0,
                "confluence_factors": [],
            })
        await asyncio.sleep(_FETCH_DELAY)

    await cache_set(cache_key, results, ttl=_CACHE_TTL)
    _mem_set(cache_key, results, ttl=_CACHE_TTL)
    return {"source": "live", "signals": results}


@router.get("/{symbol}")
async def get_signal(
    symbol: str,
    interval: str = Query("15min"),
):
    """
    Return signal for a single pair e.g. EUR-USD (use hyphen in URL).
    """
    pair = symbol.upper().replace("-", "/")
    if pair not in PAIRS:
        raise HTTPException(status_code=400, detail=f"Unknown pair: {pair}. Valid: {PAIRS}")

    cache_key = f"signal:{pair}:{interval}"
    cached = await cache_get(cache_key) or _mem_get(cache_key)
    if cached:
        return {"source": "cache", "signal": cached}

    try:
        candles = await fetch_ohlcv(pair, interval=interval, outputsize=100)
        price = _price_from_candles(candles)
        sig = generate_signal(pair, candles, price)
        result = {**sig.to_dict(), "change_pct": _change_pct_from_candles(candles)}
        await cache_set(cache_key, result, ttl=settings.signal_cache_ttl)
        return {"source": "live", "signal": result}

    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
