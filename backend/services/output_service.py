
from pathlib import Path
from copy import deepcopy
from uuid import uuid4

import numpy as np
import pydicom
from pydicom.uid import (
    generate_uid,
    SecondaryCaptureImageStorage,
    ExplicitVRLittleEndian,
)
from PIL import Image
from werkzeug.utils import secure_filename


def prepare_image(image):
    """
    Memastikan hasil enhancement berbentuk citra grayscale 8-bit.
    Tidak melakukan windowing ulang karena proses tersebut sudah
    dilakukan di enhancement_service.py.
    """
    image = np.asarray(image)

    if image.ndim != 2:
        raise ValueError("Hasil citra harus berupa citra grayscale 2D.")

    image = np.nan_to_num(
        image,
        nan=0,
        posinf=255,
        neginf=0
    )

    image = np.clip(image, 0, 255)

    return np.rint(image).astype(np.uint8)


def save_as_png(image, output_path):
    """Menyimpan citra sebagai PNG."""
    Image.fromarray(image, mode="L").save(output_path)


def save_as_dicom(image, original_dicom, output_path):
    """
    Menyimpan hasil enhancement sebagai DICOM Secondary Capture.
    Hasil ini merupakan citra turunan 8-bit, bukan CT asli.
    """
    dicom_result = deepcopy(original_dicom)

    new_sop_uid = generate_uid()

    # Gunakan SOP Class Secondary Capture untuk citra hasil proses.
    dicom_result.SOPClassUID = SecondaryCaptureImageStorage
    dicom_result.SOPInstanceUID = new_sop_uid
    dicom_result.Modality = "OT"

    # Perbarui informasi file DICOM.
    if not hasattr(dicom_result, "file_meta") or dicom_result.file_meta is None:
        dicom_result.file_meta = pydicom.dataset.FileMetaDataset()

    dicom_result.file_meta.MediaStorageSOPClassUID = (
        SecondaryCaptureImageStorage
    )
    dicom_result.file_meta.MediaStorageSOPInstanceUID = new_sop_uid
    dicom_result.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    # Informasi citra hasil.
    dicom_result.ImageType = ["DERIVED", "SECONDARY"]
    dicom_result.ConversionType = "WSD"
    dicom_result.DerivationDescription = (
        "Image processed using CT Mastoid enhancement algorithm"
    )

    dicom_result.Rows = int(image.shape[0])
    dicom_result.Columns = int(image.shape[1])
    dicom_result.SamplesPerPixel = 1
    dicom_result.PhotometricInterpretation = "MONOCHROME2"

    dicom_result.BitsAllocated = 8
    dicom_result.BitsStored = 8
    dicom_result.HighBit = 7
    dicom_result.PixelRepresentation = 0

    dicom_result.RescaleSlope = 1
    dicom_result.RescaleIntercept = 0
    dicom_result.WindowWidth = 255
    dicom_result.WindowCenter = 127

    # Hapus atribut padding CT jika ada.
    for tag in ("PixelPaddingValue", "PixelPaddingRangeLimit"):
        if tag in dicom_result:
            del dicom_result[tag]

    # Masukkan pixel data 8-bit.
    pixel_data = image.tobytes()

    # Panjang PixelData harus genap.
    if len(pixel_data) % 2 != 0:
        pixel_data += b"\x00"

    dicom_result.PixelData = pixel_data

    dicom_result.save_as(
        str(output_path),
        enforce_file_format=True
    )


def save_enhancement_outputs(
    results,
    original_dicom,
    original_filename,
    output_directory
):
    """
    Menyimpan seluruh hasil enhancement secara dinamis.

    Setiap proses upload mendapatkan folder tersendiri agar
    nama file dari upload yang berbeda tidak saling menimpa.
    """

    if not results:
        raise ValueError("Tidak ada hasil enhancement untuk disimpan.")

    # ID unik untuk satu proses upload.
    job_id = uuid4().hex

    job_directory = Path(output_directory) / job_id
    job_directory.mkdir(parents=True, exist_ok=True)

    safe_filename = secure_filename(
        Path(original_filename).stem
    ) or "ct_mastoid"

    saved_files = {}

    # Tidak menggunakan daftar hasil yang statis.
    # Semua hasil dari research atau exploration akan disimpan.
    for result_name, result_image in results.items():

        image = prepare_image(result_image)

        png_filename = f"{safe_filename}_{result_name}.png"
        dicom_filename = f"{safe_filename}_{result_name}.dcm"

        png_path = job_directory / png_filename
        dicom_path = job_directory / dicom_filename

        save_as_png(image, png_path)

        save_as_dicom(
            image,
            original_dicom,
            dicom_path
        )

        saved_files[result_name] = {
            "png": png_filename,
            "dicom": dicom_filename,
            "shape": list(image.shape),
            "dtype": str(image.dtype)
        }

    return {
        "job_id": job_id,
        "saved_files": saved_files
    }
