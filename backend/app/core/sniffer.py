import threading
import time
from scapy.all import sniff, IP, TCP, UDP, ICMP, ARP, DNSQR, Ether
from app.services.stats import StatsManager
from app.services.detector import ThreatDetector
from app.models.schemas import PacketModel

class SnifferEngine:
    def __init__(self, stats_mgr: StatsManager, detector: ThreatDetector, data_queue):
        self.stats = stats_mgr
        self.detector = detector
        self.data_queue = data_queue
        self.running = False
        self.thread = None

    def process_packet(self, packet):
        try:
            packet_size = len(packet)
            timestamp = time.time()
            
            src_mac = packet[Ether].src if packet.haslayer(Ether) else ""
            dst_mac = packet[Ether].dst if packet.haslayer(Ether) else ""
            
            src_ip = packet[IP].src if packet.haslayer(IP) else None
            dst_ip = packet[IP].dst if packet.haslayer(IP) else None
            
            protocol = "OTHER"
            sport = None
            dport = None
            tcp_flags = None
            
            if packet.haslayer(TCP):
                protocol = "TCP"
                sport = packet[TCP].sport
                dport = packet[TCP].dport
                tcp_flags = packet[TCP].flags.flagrepr()
            elif packet.haslayer(UDP):
                protocol = "UDP"
                sport = packet[UDP].sport
                dport = packet[UDP].dport
            elif packet.haslayer(ICMP):
                protocol = "ICMP"
            elif packet.haslayer(ARP):
                protocol = "ARP"
                arp = packet[ARP]
                # ARP op 2 is 'is-at' (ARP response)
                if arp.op == 2:
                    alert = self.detector.check_arp_spoofing(arp.psrc, arp.hwsrc)
                    if alert:
                        self.data_queue.append({"type": "alert", "data": alert.model_dump() if hasattr(alert, "model_dump") else alert.dict()})

            # Check for DNS Query (UDP Port 53)
            if packet.haslayer(DNSQR):
                query = packet[DNSQR].qname.decode('utf-8', errors='ignore').rstrip('.')
                if src_ip:
                    self.stats.add_dns_query(src_ip, query)
                    self.data_queue.append({"type": "dns", "data": {"src_ip": src_ip, "domain": query}})

            # Update general statistics
            if src_ip:
                self.stats.update_traffic(src_ip, packet_size)
                
            # Threat detection: TCP SYN Scan
            if protocol == "TCP" and src_ip and dport:
                alert = self.detector.check_syn_scan(src_ip, dport, tcp_flags)
                if alert:
                    self.data_queue.append({"type": "alert", "data": alert.model_dump() if hasattr(alert, "model_dump") else alert.dict()})
                    
            # Enqueue packet summary (throttle to avoid UI overload in high traffic, here we send everything but UI will truncate)
            pkt_model = PacketModel(
                src_mac=src_mac, dst_mac=dst_mac, src_ip=src_ip, dst_ip=dst_ip,
                protocol=protocol, sport=sport, dport=dport, tcp_flags=tcp_flags,
                packet_size=packet_size, timestamp=timestamp
            )
            self.data_queue.append({"type": "packet", "data": pkt_model.model_dump() if hasattr(pkt_model, "model_dump") else pkt_model.dict()})
            
        except Exception:
            # We silently ignore malformed packets during sniffing
            pass

    def start(self):
        self.running = True
        def handler(pkt):
            self.process_packet(pkt)
            
        # Run scapy sniff in a background thread to prevent blocking FastAPI
        self.thread = threading.Thread(
            target=lambda: sniff(prn=handler, store=False, stop_filter=lambda p: not self.running), 
            daemon=True
        )
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
