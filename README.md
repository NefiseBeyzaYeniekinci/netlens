# Netlens - Network NIDS & Analytics Dashboard

Netlens, ağ trafiğini gerçek zamanlı olarak izleyen, cihaz tabanlı bant genişliği kullanımı ile DNS sorgularını çıkaran ve port taramaları ile ARP Spoofing saldırılarını tespit edebilen hafif bir Ağ Saldırı Tespit Sistemi (NIDS) ve Analiz Aracıdır.

> **Uyarı:** Bu araç yalnızca savunma ve analiz amacıyla geliştirilmiştir. Aktif saldırı araçları (simülasyon dahi olsa) projeye kasten dahil edilmemiştir. Sistemin NIDS tespit yeteneklerini nmap veya arpspoof gibi standart güvenlik araçlarıyla test edebilirsiniz.

## Proje Mimarisi

- **Backend:** `scapy` ile asenkron paket yakalama, `FastAPI` + `WebSockets` üzerinden canlı veri aktarımı.
- **Frontend:** `Vite` + `React`, `Tailwind CSS` ve `Recharts` tabanlı modern, karanlık tema destekli panolar (Dashboard).

---

## 1. Backend Kurulumu ve Çalıştırılması

Paket yakalama işlemleri (sniffing), ağ arayüzlerine düşük seviyeli erişim gerektirdiği için **Yönetici (Administrator/root)** haklarıyla çalıştırılmalıdır.

1. Terminali Yönetici Olarak Açın.
2. Python sanal ortamını (venv) oluşturun ve aktif edin:
   ```bash
   cd netlens/backend
   python -m venv venv
   # Windows için:
   .\venv\Scripts\activate
   ```
3. Bağımlılıkları yükleyin:
   ```bash
   pip install -r requirements.txt
   ```
4. Sunucuyu Başlatın:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

Backend, WebSocket üzerinden `ws://127.0.0.1:8000/ws` adresinde canlı veri akışına başlayacaktır.

---

## 2. Frontend Kurulumu ve Çalıştırılması

Frontend, standart yetkilerle çalıştırılabilir.

1. Yeni bir terminal açın ve frontend dizinine geçin:
   ```bash
   cd netlens/frontend
   ```
2. Bağımlılıkları yükleyin (İlk kurulumda çalıştırıldı):
   ```bash
   npm install
   ```
3. Geliştirme Sunucusunu Başlatın:
   ```bash
   npm run dev
   ```

Çıktıda belirtilen `http://localhost:5173/` (veya benzeri) adresi tarayıcınızda açarak Dashboard'u görüntüleyebilirsiniz.

---

## 3. Tehdit Tespiti Nasıl Test Edilir?

**Port Tarama Tespiti:**
Ağdaki farklı bir makineden (veya WSL içinden) Netlens'in çalıştığı makineye nmap taraması başlatarak test edebilirsiniz.
```bash
# Sadece SYN taraması yapar ve uyarı tetikler
sudo nmap -sS -p 1-100 <netlens_ip>
```

**ARP Spoofing Tespiti:**
Yerel ağda bir ARP Spoofing saldırısı simüle etmek için `arpspoof` aracını kullanabilirsiniz.
```bash
sudo arpspoof -i <interface> -t <target_ip> <gateway_ip>
```
Netlens bu değişikliği anında algılayıp "CRITICAL" seviyesinde alarm üretecektir.
