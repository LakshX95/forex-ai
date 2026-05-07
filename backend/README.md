# Forex Signal Engine — Python Backend

FastAPI backend for the Forex Signal Engine. Provides ICT + TA signals,
walk-forward backtesting, real-time WebSocket price streaming, and
Claude-powered AI analysis.

---

## Quick start

### 1. Clone and set up environment

```bash
git clone https://github.com/you/forex-signal-engine
cd forex-signal-engine/backend

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env and add your API keys:
#   TWELVE_DATA_API_KEY  — https://twelvedata.com (free tier: 800 req/day)
#   ANTHROPIC_API_KEY    — https://console.anthropic.com
```

### 3. Start Postgres + Redis (Docker required)

```bash
docker compose up -d
```

### 4. Run the API server

```bash
uvicorn main:app --reload --port 8000
```

API docs at: http://localhost:8000/docs

---

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/signals/all?interval=15min` | Signals for all 8 pairs |
| GET | `/api/signals/EUR-USD?interval=1h` | Signal for one pair |
| POST | `/api/backtest` | Run walk-forward backtest |
| POST | `/api/ai/analyze` | Claude ICT analysis |
| WS | `/ws/prices` | Real-time price stream |

### Backtest request body

```json
{
  "symbol": "EUR/USD",
  "interval": "1h",
  "outputsize": 500,
  "risk_pct": 1.0,
  "initial_balance": 10000,
  "min_confidence": 60
}
```

### AI analysis request body

```json
{
  "symbol": "EUR/USD",
  "signal": { ...full signal object from /api/signals/EUR-USD... }
}
```

---

## Project structure

```
backend/
├── main.py                  # FastAPI app, CORS, router registration
├── requirements.txt
├── docker-compose.yml       # Postgres + Redis
├── .env.example
│
├── core/
│   ├── config.py            # Pydantic settings (reads .env)
│   └── cache.py             # Redis async helpers
│
├── data/
│   └── twelve_data.py       # Twelve Data REST + WebSocket client
│
├── engine/
│   ├── signal_engine.py     # ICT + TA signal logic (pandas)
│   └── backtest_engine.py   # Walk-forward backtest
│
└── routers/
    ├── signals.py           # GET /api/signals/*
    ├── backtest.py          # POST /api/backtest
    ├── ai_analysis.py       # POST /api/ai/analyze
    └── ws_prices.py         # WS /ws/prices
```

---

## Signal engine — confluence factors

Each factor scores 20 points (max 100). A signal fires at ≥ 60.

| Factor | Detection method |
|--------|-----------------|
| Trend | Dow Theory — 20-bar close comparison |
| Fair Value Gap | 3-candle imbalance detection |
| Order Block | Price within 15 pips of swing H/L |
| Fibonacci OTE | Price in 0.618–0.786 retracement zone |
| Kill Zone | UTC time matches London/NY/Tokyo/Sydney |

---

## Deployment

### Frontend (Vercel)
```bash
cd frontend && vercel --prod
```

### Backend (Railway)
1. Push to GitHub
2. New project → Deploy from GitHub repo → select `backend/`
3. Add environment variables from `.env`
4. Add Postgres and Redis plugins in Railway dashboard
5. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

---

## Roadmap

- [x] Phase 1 — UI prototype
- [x] Phase 2 — Live price feed (Twelve Data)
- [x] Phase 3 — Backtest engine
- [x] Phase 4 — Claude AI analysis
- [ ] Phase 5 — ML signal layer (scikit-learn / LSTM)
- [ ] Phase 6 — Alert system (email / Telegram)
- [ ] Phase 7 — Multi-timeframe confluence
