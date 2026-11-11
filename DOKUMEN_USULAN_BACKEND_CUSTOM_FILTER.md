# Dokumen Usulan Perubahan Backend (RFC)
## Fitur Tambahan Mode Eksplorasi: Matriks Filter Kustom (3×3) & Parameter Kontras Dinamis

**Status Usulan**: *Menunggu Persetujuan Pengguna (Draft)*  
**Target Modul**: `backend/routes/upload.py`, `backend/services/enhancement_service.py`, `backend/services/dicom_service.py`  
**Aturan Utama**: Kode backend **TIDAK DIUBAH** sampai usulan ini disetujui pengguna.

---

### 1. Latar Belakang & Pertanyaan Pengguna
Pada Mode Eksplorasi, terdapat dua kebutuhan peningkatan fleksibilitas:
1. **Transparansi Nilai Kernel**: Menampilkan visualisasi nilai matriks 3×3 untuk Kernel 1, Kernel 2, dan Kernel 3 *(sudah diimplementasikan di antarmuka frontend)*.
2. **Kustomisasi Input**:
   - **Apakah sebaiknya pengguna bisa memasukkan nilai matriks filter sendiri?**
   - **Apakah sebaiknya pengguna bisa mengatur batas kontras sendiri?**

---

### 2. Analisis & Rekomendasi

#### A. Memasukkan Nilai Kernel 3×3 Sendiri
- **Rekomendasi**: **Sangat Disarankan (Ya)**.
- **Alasan**:
  - Memberikan kebebasan riset nyata. Peneliti dapat menguji variasi bobot konvolusi (misalnya mengubah nilai pusat dari 8 menjadi 9 untuk *high-boost*, atau mencoba filter tepi terarah lainnya).
  - Backend saat ini sudah memiliki fungsi konvolusi `apply_high_pass_filter(image, kernel)`, sehingga hanya perlu menerima array matriks 3×3 dari frontend dan meneruskannya ke fungsi konvolusi.

#### B. Memasukkan Nilai Kontras Sendiri
- **Rekomendasi**: **Sangat Disarankan (Ya)**.
- **Alasan**:
  - Saat ini, pengaturan kontras utama citra CT dikontrol melalui **Window Width (WW)** dan **Window Level (WL)**, yang **sudah dapat diatur bebas oleh pengguna di Mode Eksplorasi**.
  - Namun, pada tahap *Contrast Enhancement* lanjutan (`imadjust`), backend saat ini mengunci batas bawah `lower_input = 0.2` dan batas atas `upper_input = 0.9`.
  - Jika pengguna diizinkan mengatur batas kontras ini (misalnya `contrast_min: 0.1` dan `contrast_max: 0.95`), pengguna dapat menghasilkan peregangan kontras yang lebih ekstrem atau lebih halus sesuai karakteristik densitas tulang mastoid pada pasien tertentu.

---

### 3. Usulan Rencana Perubahan Backend (Jika Disetujui)

#### 1. Penambahan Parameter pada `POST /upload`:
- `custom_kernel`: (Opsional) JSON array $3 \times 3$, contoh:
  ```json
  [
    [-1, -1, -1],
    [-1,  9, -1],
    [-1, -1, -1]
  ]
  ```
- `contrast_min`: (Opsional) Angka desimal antara `0.0` hingga `0.5` (default: `0.2`).
- `contrast_max`: (Opsional) Angka desimal antara `0.5` hingga `1.0` (default: `0.9`).

#### 2. Logika di Backend:
- Jika `custom_kernel` dikirim, backend memvalidasi ukuran matriks $3 \times 3$, lalu menjalankan konvolusi citra dan menyimpan outputnya sebagai `custom_hpf.png` dan `custom_hpf.dcm`.
- Jika `contrast_min` dan `contrast_max` dikirim, fungsi `apply_contrast_enhancement` menggunakan batas dinamis tersebut dan menghasilkan variasi kontras yang disesuaikan pengguna.

---

### 4. Jaminan Integritas & Keamanan
1. **Mode 1 (Penelitian Baku) Tetap Murni**: Seluruh alur penelitian baku (WW 2000, WL 400, Kontras [0.2, 0.9], Kernel 1, 2, 3, Fusi Kernel 1) tetap berjalan 100% konsisten sesuai modul penelitian PDF.
2. **Backward Compatible**: Jika parameter kustom tidak diisi, backend menggunakan nilai default penelitian tanpa error.

---

### 5. Pertanyaan Persetujuan untuk Pengguna

Apakah Anda mengizinkan implementasi logika di atas ke dalam backend?
- **Pilihan 1**: **Ya, silakan terapkan** fitur input kernel kustom dan batas kontras kustom ke dalam backend.
- **Pilihan 2**: **Cukup di frontend saja**, backend tetap seperti sekarang (menggunakan 3 kernel penelitian baku dan batas kontras standar).
