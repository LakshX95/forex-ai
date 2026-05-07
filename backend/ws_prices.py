"""
WebSocket endpoint: ws://localhost:8000/ws/prices
Streams live price ticks to connected frontend clients.
"""

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from data.twelve_data import fetch_all_prices

router = APIRouter(tags=["websocket"])

# Track all connected frontend clients
_clients: set[WebSocket] = set()


async def broadcast(message: dict):
    dead = set()
    for ws in _clients:
        try:
            await ws.send_text(json.dumps(message))
        except Exception:
            dead.add(ws)
    _clients.difference_update(dead)


@router.websocket("/ws/prices")
async def prices_ws(websocket: WebSocket):
    """
    Frontend connects here. Every 10 seconds we push updated prices
    for all 8 pairs. Replace the polling loop with a real Twelve Data
    WebSocket feed by calling PriceWebSocketManager and broadcasting ticks.
    """
    await websocket.accept()
    _clients.add(websocket)

    try:
        while True:
            prices = await fetch_all_prices()

            payload = {
                "type": "prices",
                "data": {
                    symbol: {
                        "price": info["price"],
                        "change_pct": info.get("change_pct", 0),
                    }
                    for symbol, info in prices.items()
                    if not isinstance(info, Exception)
                },
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(10)

    except WebSocketDisconnect:
        _clients.discard(websocket)
    except Exception:
        _clients.discard(websocket)
        await websocket.close()
