# Panduan Lengkap Docker & Deployment Hostinger VPS
## Sistem Pengolahan Citra CT Mastoid (HKI)

Dokumen ini berisi panduan komprehensif mengenai konfigurasi Docker, cara menjalankan aplikasi secara lokal dengan Docker Compose, serta langkah-langkah implementasi dan deployment ke **Hostinger VPS** dengan Nginx Reverse Proxy dan SSL (HTTPS).

---

## 1. Arsitektur Container Docker

Sistem terdiri dari dua layanan utama yang diorkestrasi menggunakan Docker Compose:

```
                      +-----------------------------+
                      |       Browser Klien         |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               | (Port 80/443 Nginx Reverse Proxy)         |
               v                                           v
    +--------------------+                       +--------------------+
    |  Frontend Service  |                       |  Backend Service   |
    |      (Next.js)     |                       |  (Flask/Gunicorn)  |
    |    Container :3000 |                       |   Container :5001  |
    +--------------------+                       +---------+----------+
                                                           |
                                                +----------+----------+
                                                |   Docker Volumes    |
                                                |  - backend_uploads  |
                                                |  - backend_results  |
                                                +---------------------+
```

### Rincian Layanan:
1. **`backend` (Port 5001)**:
   - **Base Image**: `python:3.10-slim`.
   - **WSGI Server**: `gunicorn` (2 workers, timeout 120 detik untuk menangani kalkulasi citra berat).
   - **Pustaka Sistem**: `libgl1`, `libgomp1`, `gcc` untuk OpenCV dan modul saintifik.
   - **Codec DICOM**: Dilengkapi `pylibjpeg` (termasuk modul dekompresi `JPEG Lossless Process 14` dan `RLE`).
   - **Persistensi Data**: Menggunakan Docker Volumes (`backend_uploads` dan `backend_results`) agar file DICOM dan hasil olahan tidak hilang saat container di-restart.

2. **`frontend` (Port 3000)**:
   - **Base Image**: `node:20-alpine`.
   - **Pola Build**: *Multi-Stage Build* (Tahap `deps`, `builder`, dan `runner`) untuk menghasilkan image produksi yang sangat ringan dan aman (dijalankan oleh user non-root `nextjs`).
   - **Build Argument**: `ARG NEXT_PUBLIC_API_URL` disuntikkan saat proses build agar client-side Next.js mengetahui alamat endpoint backend.

---

## 2. Struktur File Konfigurasi

Semua konfigurasi Docker telah disiapkan di dalam repositori:

```
Image_processing_on_CT_Mastoid_HKI/
├── docker-compose.yml          # Konfigurasi orkestrasi kedua service
├── .env.example                # Contoh konfigurasi environment variable
├── backend/
│   ├── Dockerfile              # Instruksi build image Flask + Gunicorn
│   ├── .dockerignore           # Mengabaikan venv, cache, file sementara
│   └── requirements.txt        # Dependensi Python termasuk gunicorn & pylibjpeg
└── frontend/
    ├── Dockerfile              # Multi-stage build image Next.js
    └── .dockerignore           # Mengabaikan node_modules, .next, cache
```

---

## 3. Konfigurasi Variabel Lingkungan (`.env`)

Buat file `.env` di root direktori proyek (sejajar dengan `docker-compose.yml`) dengan menyalin dari `.env.example`:

### Contoh untuk Komputer Lokal (Development/Testing):
```env
# URL backend yang diakses browser Anda
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001

# URL dasar backend untuk membuat link download file hasil
BACKEND_URL=http://127.0.0.1:5001

# Izinkan CORS dari semua origin
FRONTEND_ORIGIN=*
```

### Contoh untuk Hostinger VPS (Produksi dengan Domain):
Jika Anda menggunakan subdomain `api.domainanda.com` untuk backend dan `domainanda.com` untuk frontend:
```env
NEXT_PUBLIC_API_URL=https://api.domainanda.com
BACKEND_URL=https://api.domainanda.com
FRONTEND_ORIGIN=https://domainanda.com
```

> **Catatan Penting**: Karena Next.js mengompilasi variabel `NEXT_PUBLIC_*` ke dalam bundle JavaScript statis pada saat **tahap build**, setiap kali Anda mengubah nilai `NEXT_PUBLIC_API_URL`, container frontend **wajib di-build ulang** dengan perintah `docker compose build --no-cache frontend`.

---

## 4. Menjalankan di Komputer Lokal

Pastikan **Docker Desktop** sudah terpasang dan berstatus aktif.

### 4.1. Membangun dan Menjalankan Container
Buka terminal di root direktori proyek lalu jalankan:
```bash
docker compose up --build -d
```
Flag `-d` (*detached mode*) akan menjalankan container di latar belakang.

### 4.2. Memeriksa Status & Log
- **Melihat status container**:
  ```bash
  docker compose ps
  ```
- **Melihat log backend**:
  ```bash
  docker compose logs -f backend
  ```
- **Melihat log frontend**:
  ```bash
  docker compose logs -f frontend
  ```

### 4.3. Mengakses Aplikasi di Browser
- **Frontend Web UI**: [http://localhost:3000](http://localhost:3000)
- **Backend API Info**: [http://localhost:5001](http://localhost:5001)

### 4.4. Menghentikan Container
```bash
docker compose down
```
Jika ingin menghapus volume data juga (opsional):
```bash
docker compose down -v
```

---

## 5. Panduan Deployment di Hostinger VPS

Hostinger VPS umumnya menggunakan OS Linux berbasis **Ubuntu 22.04 LTS / 24.04 LTS** atau **Debian**. Berikut tahapan deployment dari awal:

### Langkah 1: Akses VPS via SSH
Buka terminal/PowerShell Anda:
```bash
ssh root@IP_VPS_ANDA
```

### Langkah 2: Update Sistem & Install Docker
Jalankan perintah berikut di VPS:
```bash
# Update paket sistem
sudo apt update && sudo apt upgrade -y

# Install dependensi dasar
sudo apt install -y ca-certificates curl gnupg lsb-release git nginx

# Tambahkan repositori resmi Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine dan Docker Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verifikasi instalasi
docker --version
docker compose version
```

### Langkah 3: Salin Kode Proyek ke VPS
Anda dapat menggunakan Git:
```bash
cd /var/www
git clone <URL_REPOSITORY_ANDA> mastoid-app
cd mastoid-app
```
*(Atau upload folder proyek via SFTP/FileZilla/SCP).*

### Langkah 4: Buat File `.env` Produksi
Buat file `.env` di root `/var/www/mastoid-app`:
```bash
nano .env
```
Isikan nilai sesuai domain / IP VPS Anda:
```env
NEXT_PUBLIC_API_URL=https://api.domainanda.com
BACKEND_URL=https://api.domainanda.com
FRONTEND_ORIGIN=https://domainanda.com
```
Simpan file (`Ctrl+O` lalu `Enter`, kemudian `Ctrl+X`).

### Langkah 5: Jalankan Container dengan Docker Compose
```bash
docker compose up -d --build
```
Tunggu hingga proses build selesai. Periksa apakah kedua container berjalan lancar:
```bash
docker compose ps
```

---

## 6. Konfigurasi Nginx Reverse Proxy & SSL (HTTPS)

Agar pengguna tidak perlu mengetikkan nomor port (3000 / 5001) dan web berjalan dengan aman melalui HTTPS, gunakan Nginx sebagai reverse proxy.

### 6.1. Konfigurasi Nginx untuk Frontend & Backend
Buat file konfigurasi Nginx baru:
```bash
sudo nano /etc/nginx/sites-available/mastoid.conf
```

Tempelkan konfigurasi berikut (ganti `domainanda.com` dan `api.domainanda.com` dengan domain Anda):

```nginx
# ==========================================
# 1. Konfigurasi Frontend (domainanda.com)
# ==========================================
server {
    listen 80;
    server_name domainanda.com www.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ==========================================
# 2. Konfigurasi Backend (api.domainanda.com)
# ==========================================
server {
    listen 80;
    server_name api.domainanda.com;

    # PENTING: File DICOM berukuran besar, tingkatkan batas upload
    client_max_body_size 100M;
    proxy_read_timeout 180s;
    proxy_connect_timeout 180s;
    proxy_send_timeout 180s;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi dan restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/mastoid.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6.2. Memasang SSL Gratis dengan Let's Encrypt (Certbot)
Jalankan Certbot untuk mendapatkan sertifikat HTTPS gratis secara otomatis:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domainanda.com -d www.domainanda.com -d api.domainanda.com
```
Certbot akan memperbarui file Nginx secara otomatis dengan konfigurasi SSL port 443 dan auto-redirect dari HTTP ke HTTPS.

---

## 7. Pemeliharaan dan Perintah Penting

| Perintah | Deskripsi |
| :--- | :--- |
| `docker compose up -d` | Menjalankan seluruh layanan di latar belakang |
| `docker compose up -d --build` | Membangun ulang image lalu menjalankannya |
| `docker compose build --no-cache frontend` | Membangun ulang frontend saja (gunakan ini setelah mengubah `.env`) |
| `docker compose down` | Menghentikan seluruh container |
| `docker compose logs -f backend` | Memantau log proses pemrosesan citra DICOM |
| `docker compose restart backend` | Merestart container backend tanpa downtime frontend |
| `docker system prune -f` | Membersihkan cache dan layer image yang tidak terpakai |

---

## 8. Troubleshooting Umum

1. **Error: `Payload Too Large` (413 Request Entity Too Large)**
   - *Penyebab*: Nginx secara default membatasi ukuran request upload hanya 1MB.
   - *Solusi*: Pastikan `client_max_body_size 100M;` sudah ditambahkan pada blok server backend di konfigurasi Nginx, lalu jalankan `sudo systemctl reload nginx`.

2. **Frontend Masih Menghubungi `127.0.0.1:5001` padahal `.env` Sudah Diganti**
   - *Penyebab*: Next.js mengunci variabel lingkungan saat build.
   - *Solusi*: Jalankan rebuild frontend:
     ```bash
     docker compose build --no-cache frontend
     docker compose up -d frontend
     ```

3. **CORS Error di Browser Klien**
   - *Penyebab*: Nilai `FRONTEND_ORIGIN` di `.env` belum menyertakan domain frontend Anda.
   - *Solusi*: Ubah `FRONTEND_ORIGIN=*` atau `FRONTEND_ORIGIN=https://domainanda.com` lalu restart backend (`docker compose restart backend`).

