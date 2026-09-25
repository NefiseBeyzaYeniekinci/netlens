import time
from collections import defaultdict
from app.models.schemas import AlertModel

class ThreatDetector:
    def __init__(self):
        # src_ip -> list of (timestamp, target_port)
        self.syn_requests = defaultdict(list)
        # ip -> mac
        self.arp_table = {}

    def check_syn_scan(self, src_ip: str, dport: int, flags: str) -> AlertModel:
        if not src_ip or not dport or not flags:
            return None
        
        # S: SYN, A: ACK. Only pure SYN packets are suspicious for scanning
        if "S" in flags and "A" not in flags:
            now = time.time()
            self.syn_requests[src_ip].append((now, dport))
            
            # Keep only requests within the last 5 seconds
            recent = [req for req in self.syn_requests[src_ip] if now - req[0] <= 5.0]
            self.syn_requests[src_ip] = recent
            
            # Count unique target ports
            unique_ports = {req[1] for req in recent}
            if len(unique_ports) > 15:
                # Reset to avoid spamming alerts for the same scan
                self.syn_requests[src_ip] = []
                return AlertModel(
                    level="HIGH",
                    type="PORT_SCAN",
                    message=f"Muhtemel SYN Port Taraması (Port Scan): {src_ip} üzerinden son 5s'de {len(unique_ports)} farklı porta erişim denendi.",
                    timestamp=now
                )
        return None

    def check_arp_spoofing(self, src_ip: str, src_mac: str) -> AlertModel:
        if not src_ip or not src_mac:
            return None
        
        if src_ip in self.arp_table:
            if self.arp_table[src_ip] != src_mac:
                # MAC address mismatch for the same IP!
                alert = AlertModel(
                    level="CRITICAL",
                    type="ARP_SPOOFING",
                    message=f"ARP Spoofing Tespiti! IP {src_ip} önceden {self.arp_table[src_ip]} ile eşleşiyordu, ancak şimdi {src_mac} bildirildi.",
                    timestamp=time.time()
                )
                # Do not update the table, keep the original MAC to prevent further poisoning
                return alert
        else:
            self.arp_table[src_ip] = src_mac
            
        return None
