import os
from pathlib import Path

# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

from routes.health import health_bp
from routes.upload import upload_bp

# Muat file konfigurasi .env
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# Inisialisasi aplikasi Flask
app = Flask(__name__)

# Batas ukuran upload file (default: 50 MB)
app.config["MAX_CONTENT_LENGTH"] = int(
    os.getenv("MAX_CONTENT_LENGTH", 50 * 1024 * 1024)
)

# Konfigurasi CORS dari variabel FRONTEND_ORIGIN
raw_origins = os.getenv("FRONTEND_ORIGIN", "")
frontend_origins = [
    origin.strip()
    for origin in raw_origins.split(",")
    if origin.strip()
]

if frontend_origins:
    CORS(app, resources={
        r"/*": {"origins": frontend_origins}
    })
else:
    CORS(app)

# Registrasi rute modular (Blueprints)
app.register_blueprint(health_bp)
app.register_blueprint(upload_bp)


# Handler jika ukuran file melebihi batas 50 MB
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        "status": "error",
        "message": "Ukuran file terlalu besar. Maksimal 50 MB."
    }), 413


# Endpoint utama untuk cek status server
@app.route("/")
def home():
    return "MastoidLab Image Enhancement API is Running"


# Jalankan server menggunakan host dan port dari .env
if __name__ == "__main__":
    port_env = os.getenv("FLASK_PORT") or os.getenv("PORT")
    port = int(port_env) if port_env else None

    app.run(
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
        host=os.getenv("FLASK_HOST"),
        port=port
    )


