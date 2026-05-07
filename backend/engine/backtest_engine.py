"""
Backtest Engine
Runs the signal engine over historical OHLCV data and
returns per-trade results, equity curve, and summary stats.
"""

import pandas as pd
import numpy as np
from dataclasses import dataclass, asdict
from engine.signal_engine import generate_signal, pip_size


@dataclass
class Trade:
    index: int
    symbol: str
    direction: str
    entry: float
    stop_loss: float
    take_profit: float
    sl_pips: float
    tp_pips: float
    rr_ratio: float
    result: str          # WIN | LOSS | OPEN
    pnl_pips: float
    pnl_pct: float       # % of account risked
    confidence: int
    factors: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class BacktestStats:
    symbol: str
    interval: str
    total_trades: int
    wins: int
    losses: int
    win_rate: float
    profit_factor: float
    net_pips: float
    net_pct: float
    max_drawdown_pct: float
    avg_rr: float
    equity_curve: list[float]
    trades: list[dict]

    def to_dict(self) -> dict:
        d = asdict(self)
        return d


def run_backtest(
    symbol: str,
    candles: list[dict],
    interval: str = "1h",
    risk_pct: float = 1.0,      # % of account per trade
    initial_balance: float = 10_000.0,
    min_confidence: int = 60,
    window: int = 60,            # candles fed into signal engine per step
) -> BacktestStats:
    """
    Walk-forward backtest.
    At each bar i we feed candles[i-window:i] into the signal engine,
    then simulate the trade outcome on candles[i] onward.
    """

    df = pd.DataFrame(candles).copy()
    df["open"]  = df["open"].astype(float)
    df["high"]  = df["high"].astype(float)
    df["low"]   = df["low"].astype(float)
    df["close"] = df["close"].astype(float)

    pip = pip_size(symbol)
    balance = initial_balance
    equity_curve = [balance]
    trades: list[Trade] = []
    peak = balance
    max_dd = 0.0

    for i in range(window, len(df) - 1):
        hist = df.iloc[i - window: i].to_dict("records")
        current_price = float(df.iloc[i]["close"])

        try:
            sig = generate_signal(symbol, hist, current_price)
        except Exception:
            continue

        if sig.direction == "NEUTRAL" or sig.confidence < min_confidence:
            continue

        # Simulate outcome: scan forward bars until SL or TP is hit
        result = "OPEN"
        pnl_pips = 0.0

        for j in range(i + 1, min(i + 50, len(df))):
            bar_hi = float(df.iloc[j]["high"])
            bar_lo = float(df.iloc[j]["low"])

            if sig.direction == "BUY":
                if bar_lo <= sig.stop_loss:
                    result = "LOSS"
                    pnl_pips = -sig.sl_pips
                    break
                if bar_hi >= sig.take_profit:
                    result = "WIN"
                    pnl_pips = sig.tp_pips
                    break
            else:
                if bar_hi >= sig.stop_loss:
                    result = "LOSS"
                    pnl_pips = -sig.sl_pips
                    break
                if bar_lo <= sig.take_profit:
                    result = "WIN"
                    pnl_pips = sig.tp_pips
                    break

        if result == "OPEN":
            continue    # skip incomplete trades at end of data

        # P&L in account currency (1% risk per trade)
        risk_amount = balance * (risk_pct / 100)
        pnl_pct = (pnl_pips / sig.sl_pips) * risk_pct if sig.sl_pips > 0 else 0
        pnl_currency = balance * (pnl_pct / 100)
        balance += pnl_currency

        # Drawdown tracking
        if balance > peak:
            peak = balance
        dd = ((peak - balance) / peak) * 100
        if dd > max_dd:
            max_dd = dd

        equity_curve.append(round(balance, 2))

        trades.append(Trade(
            index=i,
            symbol=symbol,
            direction=sig.direction,
            entry=sig.entry,
            stop_loss=sig.stop_loss,
            take_profit=sig.take_profit,
            sl_pips=sig.sl_pips,
            tp_pips=sig.tp_pips,
            rr_ratio=sig.rr_ratio,
            result=result,
            pnl_pips=round(pnl_pips, 1),
            pnl_pct=round(pnl_pct, 2),
            confidence=sig.confidence,
            factors=sig.confluence_factors,
        ))

    # ── Summary stats ─────────────────────────────────────────────────────────
    wins   = [t for t in trades if t.result == "WIN"]
    losses = [t for t in trades if t.result == "LOSS"]
    total  = len(trades)

    win_rate = (len(wins) / total * 100) if total > 0 else 0
    gross_profit = sum(t.pnl_pips for t in wins)
    gross_loss   = abs(sum(t.pnl_pips for t in losses))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else gross_profit
    net_pips = sum(t.pnl_pips for t in trades)
    net_pct  = ((balance - initial_balance) / initial_balance) * 100
    avg_rr   = float(np.mean([t.rr_ratio for t in trades])) if trades else 0

    return BacktestStats(
        symbol=symbol,
        interval=interval,
        total_trades=total,
        wins=len(wins),
        losses=len(losses),
        win_rate=round(win_rate, 1),
        profit_factor=round(profit_factor, 2),
        net_pips=round(net_pips, 1),
        net_pct=round(net_pct, 2),
        max_drawdown_pct=round(max_dd, 2),
        avg_rr=round(avg_rr, 2),
        equity_curve=equity_curve,
        trades=[t.to_dict() for t in trades[-50:]],   # last 50 for API response
    )
