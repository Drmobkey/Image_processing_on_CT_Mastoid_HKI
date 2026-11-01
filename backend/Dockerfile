# Menggunakan base image Python resmi (versi 3.10 slim agar ukuran container kecil)
FROM python:3.10-slim

# Mencegah Python membuat file .pyc dan memastikan output langsung tampil di log
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependensi sistem yang mungkin dibutuhkan untuk manipulasi citra
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Salin dan pasang paket Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Salin kode aplikasi
COPY . .

# Buat folder uploads dan results jika belum ada
RUN mkdir -p uploads results

# Expose port backend Flask
EXPOSE 5001

# Jalankan backend menggunakan production server Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "--timeout", "120", "app:app"]

