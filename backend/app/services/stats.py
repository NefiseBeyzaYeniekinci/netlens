from collections import defaultdict
import time

class StatsManager:
    def __init__(self):
        # src_ip -> total bytes sent
        self.ip_bytes = defaultdict(int)
        # device_ip -> list of recent domains queried
        self.dns_queries = defaultdict(list)
        
        self.start_time = time.time()
        self.total_packets = 0
        self.total_bytes = 0

    def update_traffic(self, src_ip: str, packet_size: int):
        if src_ip:
            self.ip_bytes[src_ip] += packet_size
        self.total_bytes += packet_size
        self.total_packets += 1

    def add_dns_query(self, src_ip: str, domain: str):
        if src_ip and domain:
            if domain not in self.dns_queries[src_ip]:
                self.dns_queries[src_ip].insert(0, domain)
                # Keep maximum 20 recent domains per IP to prevent memory leak
                if len(self.dns_queries[src_ip]) > 20:
                    self.dns_queries[src_ip].pop()

    def get_summary(self):
        elapsed = time.time() - self.start_time
        speed_bps = (self.total_bytes / elapsed) if elapsed > 0 else 0
        speed_kbps = speed_bps / 1024
        
        # Sort IPs by bandwidth usage
        top_ips = sorted(self.ip_bytes.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "total_packets": self.total_packets,
            "speed_kbps": round(speed_kbps, 2),
            "active_devices": len(self.ip_bytes),
            "top_ips": [{"ip": ip, "bytes": b} for ip, b in top_ips]
        }
