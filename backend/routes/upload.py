import os
from pathlib import Path
from uuid import uuid4
import json

from flask import (
    Blueprint,
    request,
    jsonify,
    send_from_directory,
    url_for
)
from werkzeug.utils import secure_filename
from pydicom.errors import InvalidDicomError

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

UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".dcm", ".dicom"}


def is_allowed_file(filename):
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def valid_job_id(job_id):
    """Memastikan job_id hanya berisi karakter heksadesimal."""
    return (
        len(job_id) == 32
        and all(char in "0123456789abcdef" for char in job_id.lower())
    )


@upload_bp.route("/upload", methods=["POST"])
def upload_dicom():

    if "file" not in request.files:
        return jsonify({
            "status": "error",
            "message": "File DICOM tidak ditemukan."
        }), 400

    uploaded_file = request.files["file"]

    if uploaded_file.filename == "":
        return jsonify({
            "status": "error",
            "message": "Silakan pilih file terlebih dahulu."
        }), 400

    if not is_allowed_file(uploaded_file.filename):
        return jsonify({
            "status": "error",
            "message": "Format file harus .dcm atau .dicom."
        }), 400

    original_filename = secure_filename(uploaded_file.filename)

    if not original_filename:
        original_filename = "ct_mastoid.dcm"

    temp_filename = f"{uuid4().hex}{Path(original_filename).suffix.lower()}"
    temp_path = UPLOAD_FOLDER / temp_filename

    try:
        uploaded_file.save(temp_path)

        # 1. Membaca DICOM dan metadata teknis.
        dicom_data = read_dicom(str(temp_path))
        metadata = get_dicom_metadata(dicom_data)

        # 2. Mengambil pixel array.
        pixel_array = get_dicom_pixel_array(dicom_data)

        # 3. Konversi pixel menjadi Hounsfield Unit.
        slope = metadata.get("rescale_slope", 1)
        intercept = metadata.get("rescale_intercept", 0)

        hu_image = convert_to_hu(
            pixel_array,
            slope,
            intercept
        )

        # 4. Membaca pilihan mode dari frontend.
        mode = request.form.get("mode", "research").lower()

        if mode not in ("research", "exploration"):
            return jsonify({
                "status": "error",
                "message": "Mode harus research atau exploration."
            }), 400

        # 5. Membaca pilihan operasi eksplorasi.
        operations = None
        fusion_kernels = None

        if mode == "exploration":
            operations_raw = request.form.get("operations", "[]")
            fusion_raw = request.form.get("fusion_kernels", "[]")

            try:
                operations = json.loads(operations_raw)
                fusion_kernels = json.loads(fusion_raw)
            except json.JSONDecodeError:
                return jsonify({
                    "status": "error",
                    "message": "Format operations atau fusion_kernels tidak valid."
                }), 400

            if not isinstance(operations, list):
                return jsonify({
                    "status": "error",
                    "message": "operations harus berupa daftar."
                }), 400

            if not isinstance(fusion_kernels, list):
                return jsonify({
                    "status": "error",
                    "message": "fusion_kernels harus berupa daftar."
                }), 400

        # 6. Membaca parameter windowing.
        try:
            window_width = float(
                request.form.get("window_width", 2000)
            )
            window_level = float(
                request.form.get("window_level", 400)
            )
        except ValueError:
            return jsonify({
                "status": "error",
                "message": "Window Width dan Window Level harus berupa angka."
            }), 400

        if window_width <= 0:
            return jsonify({
                "status": "error",
                "message": "Window Width harus lebih besar dari nol."
            }), 400

        # 7. Menjalankan enhancement sesuai mode.
        results = enhance_image(
            hu_image,
            mode=mode,
            operations=operations,
            window_width=window_width,
            window_level=window_level,
            fusion_kernels=fusion_kernels
        )

        # 8. Menyimpan seluruh hasil enhancement.
        output_data = save_enhancement_outputs(
            results,
            dicom_data,
            original_filename,
            OUTPUT_FOLDER
        )

        job_id = output_data["job_id"]
        saved_files = output_data["saved_files"]

        # 9. Membuat URL preview dan download.
        # Jika BACKEND_URL diatur di .env (misal saat deploy https://api.domain.com), gunakan URL tersebut.
        # Jika tidak, gunakan url_for(_external=True) bawaan Flask.
        backend_public_url = os.getenv("BACKEND_URL", "").rstrip("/")

        for result_name, files in saved_files.items():

            if backend_public_url:
                files["preview_url"] = f"{backend_public_url}/preview/{job_id}/{files['png']}"
                files["download_png_url"] = f"{backend_public_url}/download/{job_id}/{files['png']}"
                files["download_dicom_url"] = f"{backend_public_url}/download/{job_id}/{files['dicom']}"
            else:
                files["preview_url"] = url_for(
                    "upload.preview_file",
                    job_id=job_id,
                    filename=files["png"],
                    _external=True
                )
                files["download_png_url"] = url_for(
                    "upload.download_file",
                    job_id=job_id,
                    filename=files["png"],
                    _external=True
                )
                files["download_dicom_url"] = url_for(
                    "upload.download_file",
                    job_id=job_id,
                    filename=files["dicom"],
                    _external=True
                )

        return jsonify({
            "status": "success",
            "message": "Enhancement citra berhasil dilakukan.",
            "job_id": job_id,
            "mode": mode,
            "metadata": metadata,
            "results": saved_files
        }), 200

    except ValueError as error:
        return jsonify({
            "status": "error",
            "message": str(error)
        }), 400

    except InvalidDicomError:
        return jsonify({
            "status": "error",
            "message": "File yang diunggah bukan DICOM yang valid."
        }), 400

    except Exception as error:
        import logging
        logging.exception("Terjadi kesalahan saat memproses DICOM: %s", str(error))

        return jsonify({
            "status": "error",
            "message": f"Terjadi kesalahan saat memproses citra: {str(error)}"
        }), 500

    finally:
        if temp_path.exists():
            temp_path.unlink()


@upload_bp.route(
    "/preview/<job_id>/<filename>",
    methods=["GET"]
)
def preview_file(job_id, filename):

    if not valid_job_id(job_id):
        return jsonify({
            "status": "error",
            "message": "ID proses tidak valid."
        }), 400

    if Path(filename).suffix.lower() != ".png":
        return jsonify({
            "status": "error",
            "message": "Preview hanya tersedia untuk file PNG."
        }), 400

    job_directory = OUTPUT_FOLDER / job_id

    if not (job_directory / filename).is_file():
        return jsonify({
            "status": "error",
            "message": "File preview tidak ditemukan."
        }), 404

    return send_from_directory(
        job_directory,
        filename,
        as_attachment=False
    )


@upload_bp.route(
    "/download/<job_id>/<filename>",
    methods=["GET"]
)
def download_file(job_id, filename):

    if not valid_job_id(job_id):
        return jsonify({
            "status": "error",
            "message": "ID proses tidak valid."
        }), 400

    if Path(filename).suffix.lower() not in {".png", ".dcm"}:
        return jsonify({
            "status": "error",
            "message": "Format file tidak diizinkan."
        }), 400

    job_directory = OUTPUT_FOLDER / job_id

    if not (job_directory / filename).is_file():
        return jsonify({
            "status": "error",
            "message": "File hasil tidak ditemukan."
        }), 404

    return send_from_directory(
        job_directory,
        filename,
        as_attachment=True
    )
