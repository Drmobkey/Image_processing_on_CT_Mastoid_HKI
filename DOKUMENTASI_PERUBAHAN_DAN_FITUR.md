# 📘 Dokumentasi Perubahan Kode & Fitur Baru — Integrasi MastoidLab

Dokumen ini mencatat seluruh pembaruan teknis, fitur baru, dan perubahan kode yang dilakukan dalam rangka **menghubungkan backend (Flask/Python) dan frontend (Next.js/React)** pada aplikasi pengolahan citra medis CT Scan Tulang Mastoid.

---

## 📑 Daftar Isi
1. [Ringkasan Integrasi](#1-ringkasan-integrasi)
2. [Fitur-Fitur Baru yang Diimplementasikan](#2-fitur-fitur-baru-yang-diimplementasikan)
3. [Perubahan Kode Berkas demi Berkas](#3-perubahan-kode-berkas-demi-berkas)
4. [Skema Komunikasi Data (API Payload & Response)](#4-skema-komunikasi-data-api-payload--response)
5. [Konfigurasi Lingkungan (.env)](#5-konfigurasi-lingkungan-env)
6. [Panduan Verifikasi & Pengujian Integrasi](#6-panduan-verifikasi--pengujian-integrasi)

---

## 1. Ringkasan Integrasi

Sebelum integrasi, antarmuka frontend berjalan menggunakan simulasi timer (`setInterval`) dan gambar contoh statis dari Unsplash. Melalui pembaruan ini, seluruh alur kerja telah terhubung ke modul komputasi ilmiah backend:

| Aspek | Kondisi Sebelum Integrasi | Kondisi Setelah Integrasi |
| :--- | :--- | :--- |
| **Unggah Citra** | Simulasi progress palsu, file tidak dikirim ke server. | Dikirim menggunakan `XMLHttpRequest` dengan progress bar *real-time* (0–100%). |
| **Pratinjau Citra Asli** | Foto stok telinga/medis acak dari Unsplash. | Citra asli pasien dari file `.dcm` yang telah dikalibrasi HU dan di-*windowing* oleh backend. |
| **Ekstraksi Metadata** | Data statis dummy (`512 x 512 px`, WW: 2000, WL: 400). | Metadata dinamis asli dari tag DICOM (`Rows`, `Columns`, `Modality`, `WindowCenter`, `WindowWidth`). |
| **Pemrosesan Citra** | Timer 1 detik + filter CSS (`contrast-125 brightness-110`). | Algoritma matematis Python riil (HU Conversion, imadjust contrast, konvolusi 2D HPF, peleburan fusi). |
| **Pilihan Mode** | Tidak ada pemisahan mode operasi. | Tersedia **Mode Penelitian (Baku)** dan **Mode Eksplorasi Interaktif** (kustomisasi WW/WL & kernel). |
| **Tinjau Hasil** | Hanya menampilkan 1 gambar statis hasil filter CSS. | **Interactive Result Selector** untuk membandingkan luaran Original, Kontras, HPF 1, HPF 2, HPF 3, dan Fusi. |
| **Unduh Hasil** | Tombol mati tanpa aksi. | Unduh instan file gambar **PNG** dan file medis **DICOM Secondary Capture (.dcm)**. |

---

## 2. Fitur-Fitur Baru yang Diimplementasikan

### 1. Pelacakan Unggahan Akurat (*Live Upload Progress*)
Frontend memanfaatkan `xhr.upload.onprogress` untuk menghitung persentase byte data yang ditransfer ke server, memberikan umpan balik visual yang transparan kepada pengguna saat mengunggah file DICOM besar (5–50 MB).

### 2. Dual Mode Operasi Pemrosesan Citra
Tersedia tombol pemilih mode di Langkah 2:
- **Mode Penelitian (Baku)**:
  - Berjalan otomatis sesuai parameter modul penelitian HKI ($WW=2000, WL=400$).
  - Backend langsung mengeksekusi ke-6 tahap secara simultan.
- **Mode Eksplorasi**:
  - Membuka kolom input numerik interaktif untuk mengubah nilai Window Width (WW) dan Window Level (WL).
  - Memungkinkan dokter/peneliti memilih pasangan kernel HPF khusus yang akan dileburkan dalam fusi citra.

### 3. Pratinjau Citra CT Asli Nyata
Browser web standar tidak dapat membaca format DICOM secara langsung. Backend mengonversi slice DICOM menjadi PNG 8-bit yang optimal, sehingga pengguna dapat melihat citra CT asli tulen beserta fitur pembesaran (*zoom in/out* hingga 250% dan *reset*).

### 4. Interactive Result Selector di Layar Hasil (Langkah 3)
Pada tampilan perbandingan hasil, pengguna tidak lagi terpaku pada satu metode saja. Disediakan tombol navigasi cepat untuk beralih instan antara:
- `Original` (Windowed CT)
- `Kontras` (Peningkatan Kontras)
- `HPF 1` (Penajaman Tepi Kernel 1)
- `HPF 2` (Penajaman Tepi Kernel 2)
- `HPF 3` (Penajaman Tepi Kernel 3)
- `Fusi` (Peleburan Windowed + HPF)

### 5. Ekspor Multi-Format (PNG & DICOM)
Layar hasil dilengkapi dua tombol unduh resmi:
- **Unduh PNG**: Untuk kebutuhan dokumentasi, laporan penelitian, atau presentasi medis.
- **Unduh DICOM (.dcm)**: File DICOM turunan berstandar *Secondary Capture* (`Modality: OT`) yang dapat dibuka di PACS viewer profesional (seperti Horos, RadiAnt, atau MicroDicom).

### 6. Sistem Penanganan Error Komprehensif
- Mendeteksi jika file yang diunggah bukan modalitas CT (misalnya file foto rontgen CR atau MRI).
- Menolak file melebihi batas ukuran 50 MB dengan pesan JSON yang jelas.
- Menampilkan status koneksi jika server backend belum diaktifkan beserta petunjuk perbaikan.

---

## 3. Perubahan Kode Berkas demi Berkas

### A. Berkas `frontend/app/page.tsx`
1. **Import & Tipe Data**:
   - Menambahkan interface `ProcessResultItem` dan `DicomMetadata`.
   - Mengimpor ikon `Download`, `FileDown`, `SlidersHorizontal`, dan `Layers` dari `lucide-react`.
2. **State Management**:
   - Menambahkan state `rawFile` (menyimpan objek `File` untuk pemrosesan ulang).
   - Menambahkan state `processingMode` (`"research"` | `"exploration"`).
   - Menambahkan state `customWW` dan `customWL` untuk mode eksplorasi.
   - Menambahkan state `resultsData` untuk menampung seluruh URL hasil dan metadata dari backend.
   - Menambahkan state `activeResultKey` untuk mengontrol hasil mana yang sedang ditinjau.
3. **Fungsi `processUploadFile(file)`**:
   - Mengganti `setInterval` tiruan dengan request `POST` nyata ke `${API_BASE_URL}/upload`.
   - Memetakan metadata respons backend (`modality`, `rows`, `columns`, `window_width`, `window_center`).
4. **Fungsi `handleProcessImage()`**:
   - Jika dalam mode eksplorasi, mengirimkan parameter `window_width`, `window_level`, dan `fusion_kernels` baru ke backend via `fetch()`.
   - Jika dalam mode penelitian, langsung mengaktifkan hasil yang sudah siap di `resultsData`.
5. **Fungsi `handleDownload(format)`**:
   - Membuka URL unduhan langsung (`download_png_url` atau `download_dicom_url`) secara aman melalui `window.open(url, "_blank")`.
6. **Perbaikan *Bug Typo* CSS**:
   - Memperbaiki `tracking-widerr` -> `tracking-wider`.
   - Memperbaiki `onClick={() => { handleReset }}` -> `onClick={handleReset}`.
   - Memperbaiki `rounded-lgg` -> `rounded-lg`.
   - Memperbaiki `groud-hover:opacity-100` -> `group-hover:opacity-100`.
   - Memperbaiki `flex-xol` -> `flex-col`.

### B. Berkas `frontend/.env` (Baru)
Dibuat sesuai permintaan agar menggunakan `.env` (bukan `.env.local`):
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001
```

### C. Berkas `backend/app.py`
1. **Dukungan Multi-Origin pada CORS**:
   Origin membaca daftar URL dari variabel `FRONTEND_ORIGIN` (contoh: `http://localhost:3000,http://127.0.0.1:3000`).
2. **Penghapusan Seluruh Nilai Port Hardcode**:
   Port dibaca dinamis dari `os.getenv("FLASK_PORT") or os.getenv("PORT")` tanpa nilai *fallback* angka yang tertulis di kode.
3. **Penangan Error 413 (File Terlalu Besar)**:
   Mengembalikan format JSON `{ "status": "error", "message": "Ukuran file terlalu besar. Maksimal 50 MB." }`.
4. **Penyederhanaan Komentar**:
   Komentar dibuat padat dan to-the-point (1 baris per bagian).

### D. Berkas `backend/requirements.txt`
Menambahkan dependensi yang dibutuhkan secara lengkap:
- `Flask>=3.0.0`
- `flask-cors>=4.0.0`
- `pydicom>=2.4.0`
- `numpy>=1.24.0`
- `scipy>=1.10.0`
- `matplotlib>=3.7.0`
- `Pillow>=10.0.0`
- `python-dotenv>=1.0.0`

---

## 4. Skema Komunikasi Data (API Payload & Response)

### Permintaan (*Request Payload*):
* **Endpoint**: `POST /upload`
* **Format**: `multipart/form-data`
* **Field**:
  * `file`: File biner `.dcm` / `.dicom`
  * `mode`: `"research"` atau `"exploration"`
  * `window_width`: Nilai angka (misal: `2000`)
  * `window_level`: Nilai angka (misal: `400`)
  * `operations`: JSON string (misal: `["windowing", "contrast", "hpf_1", "hpf_2", "hpf_3", "fusion"]`)
  * `fusion_kernels`: JSON string (misal: `["hpf_1"]`)

### Respons Sukses (*Response JSON*):
```json
{
  "status": "success",
  "message": "Enhancement citra berhasil dilakukan.",
  "job_id": "4a7f6c3821034d67969019de50ad8593",
  "mode": "research",
  "metadata": {
    "modality": "CT",
    "rows": 512,
    "columns": 512,
    "rescale_slope": 1.0,
    "rescale_intercept": -1024.0,
    "window_width": 2000.0,
    "window_center": 400.0
  },
  "results": {
    "original": {
      "png": "ct_mastoid_original.png",
      "dicom": "ct_mastoid_original.dcm",
      "shape": [512, 512],
      "dtype": "uint8",
      "preview_url": "http://127.0.0.1:5001/preview/4a7f6c.../ct_mastoid_original.png",
      "download_png_url": "http://127.0.0.1:5001/download/4a7f6c.../ct_mastoid_original.png",
      "download_dicom_url": "http://127.0.0.1:5001/download/4a7f6c.../ct_mastoid_original.dcm"
    },
    "contrast": { "...": "..." },
    "hpf_1": { "...": "..." },
    "hpf_2": { "...": "..." },
    "hpf_3": { "...": "..." },
    "fusion": { "...": "..." }
  }
}
```

---

## 5. Konfigurasi Lingkungan (`.env`)

### File `backend/.env`
```ini
FLASK_HOST=127.0.0.1
FLASK_PORT=5001
FLASK_DEBUG=true
FRONTEND_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
MAX_CONTENT_LENGTH=52428800
```

### File `frontend/.env`
```ini
NEXT_PUBLIC_API_URL=http://127.0.0.1:5001
```

---

## 6. Panduan Verifikasi & Pengujian Integrasi

Untuk menguji integrasi end-to-end secara langsung:

1. **Jalankan Backend**:
   ```powershell
   cd "d:\Koding\mbak deva\Image_processing_on_CT_Mastoid_HKI\backend"
   .\venv\Scripts\Activate.ps1
   python app.py
   ```
   *(Pastikan server berjalan di port `5001`)*.

2. **Jalankan Frontend di Terminal Lain**:
   ```powershell
   cd "d:\Koding\mbak deva\Image_processing_on_CT_Mastoid_HKI\frontend"
   npm run dev
   ```
   *(Buka peramban di `http://localhost:3000`)*.

3. **Uji Alur Kerja**:
   - Tarik dan lepas file CT mastoid `.dcm` ke dropzone.
   - Perhatikan progress bar unggahan `0% -> 100%`.
   - Di Langkah 2, pastikan citra asli CT tampil jelas di viewer hitam dan metadata scanner muncul.
   - Pilih metode (misal: *Fusi Citra* atau *High-Pass Filter Kernel 1*), lalu klik **Proses citra**.
   - Di Langkah 3, bandingkan citra asli dengan citra hasil. Gunakan tombol tab (*Original, Kontras, HPF 1, HPF 2, HPF 3, Fusi*) untuk berganti luaran.
   - Klik **Unduh PNG** dan **Unduh DICOM (.dcm)** untuk memverifikasi file berhasil tersimpan di komputer Anda.

