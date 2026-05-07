import httpx
import asyncio
import json
import websockets
from typing import Callable
from core.config import get_settings

settings = get_settings()

PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "NZD/USD", "USD/CHF", "EUR/GBP"]
WS_PAIRS = [p.replace("/", "") for p in PAIRS]   # EURUSD, GBPUSD …

BASE_URL = "https://api.twelvedata.com"


async def fetch_live_price(symbol: str) -> dict:
    """
    Fetch latest quote for a single pair.
    Returns: { symbol, price, change, change_pct, timestamp }
    """
    sym = symbol.replace("/", "")
    url = f"{BASE_URL}/price"
    params = {"symbol": sym, "apikey": settings.twelve_data_api_key}

    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    return {
        "symbol": symbol,
        "price": float(data["price"]),
        "change": 0.0,
        "change_pct": 0.0,
        "timestamp": None,
    }


async def fetch_ohlcv(symbol: str, interval: str = "15min", outputsize: int = 100) -> list[dict]:
    """
    Fetch OHLCV candles. interval: 1min 5min 15min 1h 4h 1day
    Returns list of { datetime, open, high, low, close, volume }
    """
    sym = symbol.replace("/", "")
    url = f"{BASE_URL}/time_series"
    params = {
        "symbol": sym,
        "interval": interval,
        "outputsize": outputsize,
        "apikey": settings.twelve_data_api_key,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    if "values" not in data:
        raise ValueError(f"Twelve Data error for {symbol}: {data.get('message', 'unknown')}")

    candles = []
    for c in reversed(data["values"]):   # oldest → newest
        candles.append({
            "datetime": c["datetime"],
            "open":   float(c["open"]),
            "high":   float(c["high"]),
            "low":    float(c["low"]),
            "close":  float(c["close"]),
            "volume": float(c.get("volume", 0)),
        })
    return candles


async def fetch_all_prices() -> dict[str, dict]:
    """Fetch latest prices for all pairs concurrently."""
    tasks = [fetch_live_price(p) for p in PAIRS]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return {
        PAIRS[i]: r for i, r in enumerate(results)
        if not isinstance(r, Exception)
    }


class PriceWebSocketManager:
    """
    Streams real-time tick prices from Twelve Data WebSocket.
    Calls on_tick(symbol, price) for every incoming tick.
    """

    WS_URL = "wss://ws.twelvedata.com/v1/quotes/price"

    def __init__(self, on_tick: Callable[[str, float], None]):
        self.on_tick = on_tick
        self._running = False

    async def connect(self):
        self._running = True
        subscribe_msg = {
            "action": "subscribe",
            "params": {
                "symbols": ",".join(WS_PAIRS),
                "apikey": settings.twelve_data_api_key,
            },
        }

        while self._running:
            try:
                async with websockets.connect(self.WS_URL) as ws:
                    await ws.send(json.dumps(subscribe_msg))
                    async for raw in ws:
                        msg = json.loads(raw)
                        if msg.get("event") == "price":
                            sym_raw = msg.get("symbol", "")
                            # Convert EURUSD → EUR/USD
                            sym = sym_raw[:3] + "/" + sym_raw[3:] if len(sym_raw) == 6 else sym_raw
                            price = float(msg.get("price", 0))
                            if price:
                                self.on_tick(sym, price)
            except Exception as e:
                print(f"[WS] disconnected: {e}. Reconnecting in 5s…")
                await asyncio.sleep(5)

    def stop(self):
        self._running = False
