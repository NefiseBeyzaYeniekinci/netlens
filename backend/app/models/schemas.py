from pydantic import BaseModel
from typing import Optional

class PacketModel(BaseModel):
    src_mac: str
    dst_mac: str
    src_ip: Optional[str]
    dst_ip: Optional[str]
    protocol: str
    sport: Optional[int]
    dport: Optional[int]
    tcp_flags: Optional[str]
    packet_size: int
    timestamp: float

class AlertModel(BaseModel):
    level: str
    type: str
    message: str
    timestamp: float
