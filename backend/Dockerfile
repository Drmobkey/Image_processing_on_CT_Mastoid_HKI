# Gunakan base image Python yang ringan
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_HOST=0.0.0.0 \
    FLASK_PORT=5001

# Set working directory
WORKDIR /app

# Install dependensi sistem dasar untuk manipulasi citra
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Salin file requirements terlebih dahulu untuk caching layer Docker
COPY requirements.txt .

# Install paket-paket Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Salin seluruh kode backend
COPY . .

# Buat direktori uploads dan results jika belum ada
RUN mkdir -p uploads results

# Expose port backend Flask
EXPOSE 5001

# Jalankan server menggunakan Gunicorn (WSGI server produksi)
CMD ["gunicorn", "-w", "2", "--bind", "0.0.0.0:5001", "--timeout", "120", "app:app"]

