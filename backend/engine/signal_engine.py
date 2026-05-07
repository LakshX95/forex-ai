"""
Signal Engine — ICT + Classic TA
Detects: Swing Points, Fair Value Gaps, Order Blocks,
         Fibonacci OTE, Kill Zones, and scores confluence.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timezone
from dataclasses import dataclass, asdict


# ── Kill Zones (UTC hours) ────────────────────────────────────────────────────
KILL_ZONES = {
    "Sydney":  (21, 0),
    "Tokyo":   (0, 3),
    "London":  (7, 10),
    "New York": (12, 15),
}

PAIR_PIPS = {
    "USD/JPY": 0.01,
    "default": 0.0001,
}


def pip_size(symbol: str) -> float:
    return PAIR_PIPS.get(symbol, PAIR_PIPS["default"])


# ── Data Structures ───────────────────────────────────────────────────────────

@dataclass
class SignalResult:
    symbol: str
    direction: str          # BUY | SELL | NEUTRAL
    confidence: int         # 0–100
    trend: str              # bullish | bearish | ranging
    entry: float
    stop_loss: float
    take_profit: float
    sl_pips: float
    tp_pips: float
    rr_ratio: float
    kill_zone: str
    kill_zone_active: bool
    fvg_detected: bool
    fvg_direction: str
    order_block_hit: bool
    near_fib_ote: bool
    swing_high: float
    swing_low: float
    fib_618: float
    fib_786: float
    confluence_factors: list[str]
    timestamp: str

    def to_dict(self) -> dict:
        import json
        # Convert numpy scalars → native Python so FastAPI can JSON-serialize them
        raw = asdict(self)
        return json.loads(json.dumps(raw, default=lambda o: o.item() if hasattr(o, 'item') else float(o)))


# ── Helper functions ──────────────────────────────────────────────────────────

def active_kill_zone() -> tuple[str, bool]:
    hour = datetime.now(timezone.utc).hour
    for name, (start, end) in KILL_ZONES.items():
        if start < end:
            if start <= hour < end:
                return name, True
        else:   # wraps midnight
            if hour >= start or hour < end:
                return name, True
    return "Interbank", False


def detect_swing_points(df: pd.DataFrame, lookback: int = 5) -> tuple[float, float]:
    """Return (swing_high, swing_low) over the last `lookback` candles."""
    window = df.tail(lookback * 2)
    return window["high"].max(), window["low"].min()


def detect_trend(df: pd.DataFrame) -> str:
    """Simple Dow Theory trend: compare most recent 20-bar HH/HL structure."""
    closes = df["close"].tail(20)
    if closes.iloc[-1] > closes.iloc[0] * 1.001:
        return "bullish"
    elif closes.iloc[-1] < closes.iloc[0] * 0.999:
        return "bearish"
    return "ranging"


def detect_fvg(df: pd.DataFrame) -> tuple[bool, str]:
    """
    Fair Value Gap: candle[i-2].high < candle[i].low (bullish FVG)
                 or candle[i-2].low  > candle[i].high (bearish FVG)
    """
    if len(df) < 3:
        return False, "none"

    c0, c1, c2 = df.iloc[-3], df.iloc[-2], df.iloc[-1]

    if c0["high"] < c2["low"]:     # bullish imbalance
        return True, "bull"
    if c0["low"] > c2["high"]:     # bearish imbalance
        return True, "bear"
    return False, "none"


def detect_order_block(df: pd.DataFrame, price: float, symbol: str) -> bool:
    """
    Order Block: last significant opposing candle before a strong move.
    Simplified: price within 15 pips of recent swing H/L.
    """
    pip = pip_size(symbol)
    swing_hi, swing_lo = detect_swing_points(df, lookback=10)
    near_hi = abs(price - swing_hi) < pip * 15
    near_lo = abs(price - swing_lo) < pip * 15
    return near_hi or near_lo


def detect_fib_ote(swing_high: float, swing_low: float, price: float) -> tuple[bool, float, float]:
    """
    OTE zone = 0.618 – 0.786 retracement.
    Returns (in_ote_zone, fib_618, fib_786)
    """
    rng = swing_high - swing_low
    fib618 = swing_high - rng * 0.618
    fib786 = swing_high - rng * 0.786
    lo, hi = min(fib618, fib786), max(fib618, fib786)
    return lo <= price <= hi, fib618, fib786


def calculate_levels(
    direction: str,
    entry: float,
    swing_high: float,
    swing_low: float,
    symbol: str,
    rr: float = 2.5,
) -> tuple[float, float, float, float]:
    """
    Returns (stop_loss, take_profit, sl_pips, tp_pips).
    SL is placed beyond the nearest swing; TP is SL * RR.
    """
    pip = pip_size(symbol)
    buffer = pip * 5   # small buffer beyond swing

    if direction == "BUY":
        sl = swing_low - buffer
        sl_pips = round((entry - sl) / pip, 1)
        tp_pips = round(sl_pips * rr, 1)
        tp = entry + tp_pips * pip
    else:   # SELL
        sl = swing_high + buffer
        sl_pips = round((sl - entry) / pip, 1)
        tp_pips = round(sl_pips * rr, 1)
        tp = entry - tp_pips * pip

    return sl, tp, sl_pips, tp_pips


# ── Main Signal Function ──────────────────────────────────────────────────────

def generate_signal(symbol: str, candles: list[dict], price: float) -> SignalResult:
    """
    Full ICT + TA confluence analysis.
    candles: list of { open, high, low, close, volume, datetime }
    price:   current live price
    """

    df = pd.DataFrame(candles)
    df["open"]  = df["open"].astype(float)
    df["high"]  = df["high"].astype(float)
    df["low"]   = df["low"].astype(float)
    df["close"] = df["close"].astype(float)

    # ── Individual factor analysis ────────────────────────────────────────────
    trend = detect_trend(df)
    swing_hi, swing_lo = detect_swing_points(df, lookback=20)
    fvg, fvg_dir = detect_fvg(df)
    ob_hit = detect_order_block(df, price, symbol)
    in_ote, fib618, fib786 = detect_fib_ote(swing_hi, swing_lo, price)
    kz_name, kz_active = active_kill_zone()

    # ── Confluence scoring (each factor = 20 pts) ─────────────────────────────
    score = 0
    factors: list[str] = []

    bullish_bias = trend == "bullish"
    bearish_bias = trend == "bearish"

    if trend in ("bullish", "bearish"):
        score += 20
        factors.append(f"Trend: {trend}")

    if fvg:
        fvg_aligned = (fvg_dir == "bull" and bullish_bias) or (fvg_dir == "bear" and bearish_bias)
        if fvg_aligned:
            score += 20
            factors.append(f"FVG ({fvg_dir})")

    if ob_hit:
        score += 20
        factors.append("Order Block")

    if in_ote:
        score += 20
        factors.append("Fib OTE (0.618–0.786)")

    if kz_active:
        score += 20
        factors.append(f"{kz_name} Kill Zone")

    # ── Direction decision ────────────────────────────────────────────────────
    if score >= 60 and bullish_bias:
        direction = "BUY"
        rr = round(np.random.uniform(2.0, 3.2), 1)
    elif score >= 60 and bearish_bias:
        direction = "SELL"
        rr = round(np.random.uniform(2.0, 3.2), 1)
    else:
        direction = "NEUTRAL"
        rr = 0.0

    # ── Entry / SL / TP ───────────────────────────────────────────────────────
    entry = price
    if direction != "NEUTRAL":
        sl, tp, sl_pips, tp_pips = calculate_levels(direction, entry, swing_hi, swing_lo, symbol, rr)
    else:
        sl = tp = sl_pips = tp_pips = 0.0

    return SignalResult(
        symbol=symbol,
        direction=direction,
        confidence=score,
        trend=trend,
        entry=entry,
        stop_loss=sl,
        take_profit=tp,
        sl_pips=sl_pips,
        tp_pips=tp_pips,
        rr_ratio=rr,
        kill_zone=kz_name,
        kill_zone_active=kz_active,
        fvg_detected=fvg,
        fvg_direction=fvg_dir,
        order_block_hit=ob_hit,
        near_fib_ote=in_ote,
        swing_high=swing_hi,
        swing_low=swing_lo,
        fib_618=fib618,
        fib_786=fib786,
        confluence_factors=factors,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
