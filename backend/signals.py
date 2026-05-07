from fastapi import APIRouter, HTTPException, Query
from data.twelve_data import fetch_ohlcv, fetch_all_prices, fetch_live_price, PAIRS
from engine.signal_engine import generate_signal
from core.cache import cache_get, cache_set
from core.config import get_settings

router = APIRouter(prefix="/api/signals", tags=["signals"])
settings = get_settings()


@router.get("/all")
async def get_all_signals(interval: str = Query("15min", description="Candle interval")):
    """
    Return signals for all 8 major pairs.
    Results cached for SIGNAL_CACHE_TTL seconds.
    """
    cache_key = f"signals:all:{interval}"
    cached = await cache_get(cache_key)
    if cached:
        return {"source": "cache", "signals": cached}

    # Fetch prices concurrently
    prices = await fetch_all_prices()
    results = []

    for pair in PAIRS:
        try:
            price_data = prices.get(pair)
            if not price_data:
                continue

            candles = await fetch_ohlcv(pair, interval=interval, outputsize=100)
            sig = generate_signal(pair, candles, price_data["price"])
            results.append({**sig.to_dict(), **{"change_pct": price_data.get("change_pct", 0)}})
        except Exception as e:
            results.append({
                "symbol": pair,
                "error": str(e),
                "direction": "NEUTRAL",
                "confidence": 0,
            })

    await cache_set(cache_key, results, ttl=settings.signal_cache_ttl)
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
    cached = await cache_get(cache_key)
    if cached:
        return {"source": "cache", "signal": cached}

    try:
        price_data = await fetch_live_price(pair)
        candles = await fetch_ohlcv(pair, interval=interval, outputsize=100)
        sig = generate_signal(pair, candles, price_data["price"])

        result = sig.to_dict()
        await cache_set(cache_key, result, ttl=settings.signal_cache_ttl)
        return {"source": "live", "signal": result}

    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
