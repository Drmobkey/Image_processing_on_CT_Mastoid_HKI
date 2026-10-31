from flask import Flask, jsonify
from routes.health import health_bp
from routes.upload import upload_bp

app = Flask(__name__)

app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024

app.register_blueprint(health_bp)
app.register_blueprint(upload_bp)

@app.route("/")
def home():
    return "Mastoid CT Image Enchancement API is Running"



if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)