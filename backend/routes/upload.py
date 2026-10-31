from flask import Blueprint, request, jsonify
from pathlib import Path
from uuid import uuid4
from werkzeug.utils import secure_filename
import pydicom

from services.dicom_service import (
    read_dicom,
    get_dicom_metadata,
    get_dicom_pixel_array,
    convert_to_hu
)

from services.enhancement_service import enhance_image
from services.output_service import save_enhancement_outputs


upload_bp = Blueprint("upload", __name__)

BASE_FOLDER = Path(__file__).resolve().parent.parent

UPLOAD_FOLDER = BASE_FOLDER / "uploads"
OUTPUT_FOLDER = BASE_FOLDER / "results"

ALLOWED_EXTENSIONS = {".dcm", ".dicom"}


def make_json_safe(value):
    """Mengubah nilai metadata DICOM menjadi tipe yang bisa dikirim sebagai JSON."""

    if value is None:
        return None

    if isinstance(value, (list, tuple)):
        return [make_json_safe(item) for item in value]

    if hasattr(value, "__iter__") and not isinstance(value, (str, bytes, dict)):
        try:
            return [make_json_safe(item) for item in value]
        except TypeError:
            pass

    if isinstance(value, (int, float, str, bool)):
        return value

    return str(value)


@upload_bp.route("/upload", methods=["POST"])
def upload_file():

    # 1. Memastikan file dikirim
    if "file" not in request.files:
        return jsonify({
            "status": "error",
            "message": "File tidak ditemukan dalam request"
        }), 400

    file = request.files["file"]

    # 2. Memastikan nama file tersedia
    if not file.filename:
        return jsonify({
            "status": "error",
            "message": "Belum ada file yang dipilih"
        }), 400

    # 3. Memeriksa ekstensi
    original_filename = secure_filename(file.filename)
    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({
            "status": "error",
            "message": "Format file harus .dcm atau .dicom"
        }), 400

    # 4. Membuat nama internal unik
    unique_filename = f"{uuid4().hex}{extension}"

    UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
    save_path = UPLOAD_FOLDER / unique_filename

    file.save(save_path)

    try:
        # 5. Membaca DICOM
        dicom_data = read_dicom(save_path)

        # 6. Mengambil metadata
        metadata = get_dicom_metadata(dicom_data)

        # 7. Mengambil matriks piksel
        pixel_array = get_dicom_pixel_array(dicom_data)

        # 8. Konversi ke HU
        hu_image = convert_to_hu(
            pixel_array,
            metadata["rescale_slope"],
            metadata["rescale_intercept"]
        )

        # 9. Menjalankan image enhancement
        results = enhance_image(hu_image)

        # 10. Menyimpan hasil PNG dan DICOM
        saved_files = save_enhancement_outputs(
            results=results,
            original_dicom=dicom_data,
            original_filename=original_filename,
            output_directory=OUTPUT_FOLDER
        )

        # 11. Mengirim respons
        return jsonify({
            "status": "success",
            "message": "DICOM berhasil diproses",
            "original_filename": original_filename,
            "image_size": {
                "rows": int(hu_image.shape[0]),
                "columns": int(hu_image.shape[1])
            },
            "metadata": make_json_safe(metadata),
            "results": saved_files
        }), 200

    except ValueError as error:
        return jsonify({
            "status": "error",
            "message": str(error)
        }), 400

    except pydicom.errors.InvalidDicomError:
        return jsonify({
            "status": "error",
            "message": "File yang diunggah bukan file DICOM yang valid"
        }), 400

    except Exception:
        return jsonify({
            "status": "error",
            "message": "Terjadi kesalahan saat memproses file DICOM"
        }), 500

    finally:
        # Menghapus file upload sementara
        if save_path.exists():
            save_path.unlink()