import asyncio
from collections import deque
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.sniffer import SnifferEngine
from app.services.stats import StatsManager
from app.services.detector import ThreatDetector

app = FastAPI(title="Netlens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared global state
stats_mgr = StatsManager()
detector = ThreatDetector()
data_queue = deque() # thread-safe append/popleft
sniffer = SnifferEngine(stats_mgr, detector, data_queue)

@app.on_event("startup")
async def startup_event():
    # Start the packet sniffer on application startup
    sniffer.start()

@app.on_event("shutdown")
async def shutdown_event():
    # Gracefully stop the sniffer
    sniffer.stop()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # 1. Send overall stats summary
            summary = stats_mgr.get_summary()
            await websocket.send_json({"type": "summary", "data": summary})
            
            # 2. Drain events (packets, dns, alerts) from the queue and send
            items_sent = 0
            while data_queue and items_sent < 100:  # send max 100 items per tick to prevent blocking
                try:
                    item = data_queue.popleft()
                    await websocket.send_json(item)
                    items_sent += 1
                except IndexError:
                    break
                    
            # Update interval for frontend (approx 5Hz is enough for smooth UI)
            await asyncio.sleep(0.2)
            
    except WebSocketDisconnect:
        print("Client disconnected from WebSocket")

if __name__ == "__main__":
    # Standard entry point if run directly
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
