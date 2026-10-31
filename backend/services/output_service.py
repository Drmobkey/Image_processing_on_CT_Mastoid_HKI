from pathlib import Path
from copy import deepcopy

import numpy as np
import pydicom
from pydicom.uid import generate_uid
from pydicom.uid import CTImageStorage
from PIL import Image

from services.dicom_service import apply_window_level


# Enam hasil yang akan disimpan
RESULT_NAMES = [
    "original",
    "contrast",
    "hpf_1",
    "hpf_2",
    "hpf_3",
    "fusion"
]


def prepare_image(image, result_name):
    """
    Menyiapkan gambar agar memiliki format uint8
    sebelum disimpan sebagai PNG dan DICOM.
    """

    if result_name == "original":
        image = apply_window_level(
            image,
            window_width=2000,
            window_level=400
        )
    else:
        image = np.asarray(image)

        image = np.clip(
            image,
            0,
            255
        ).astype(np.uint8)

    return image


def save_as_png(image, output_path):
    """
    Menyimpan gambar dalam format PNG.
    """

    Image.fromarray(image).save(output_path)


def save_as_dicom(image, original_dicom, output_path):
    """
    Membuat DICOM turunan dari gambar hasil enhancement.
    """

    dicom_result = deepcopy(original_dicom)

    # Membuat identitas DICOM baru
    new_sop_uid = generate_uid()

    dicom_result.SOPClassUID = CTImageStorage
    dicom_result.SOPInstanceUID = new_sop_uid

    dicom_result.file_meta.MediaStorageSOPClassUID = CTImageStorage
    dicom_result.file_meta.MediaStorageSOPInstanceUID = new_sop_uid

    # Mengatur identitas gambar turunan
    dicom_result.ImageType = ["DERIVED", "SECONDARY"]
    dicom_result.DerivationDescription = (
        "Image processed using CT Mastoid enhancement algorithm"
    )

    # Mengatur format piksel 8-bit unsigned
    dicom_result.Rows = int(image.shape[0])
    dicom_result.Columns = int(image.shape[1])
    dicom_result.SamplesPerPixel = 1
    dicom_result.PhotometricInterpretation = "MONOCHROME2"

    dicom_result.BitsAllocated = 8
    dicom_result.BitsStored = 8
    dicom_result.HighBit = 7
    dicom_result.PixelRepresentation = 0

    # Mengatur ulang parameter HU
    dicom_result.RescaleSlope = 1
    dicom_result.RescaleIntercept = 0

    # Window untuk gambar hasil 8-bit
    dicom_result.WindowWidth = 255
    dicom_result.WindowCenter = 127

    # Menghapus atribut pixel padding dari gambar asli
    if "PixelPaddingValue" in dicom_result:
        del dicom_result.PixelPaddingValue

    if "PixelPaddingRangeLimit" in dicom_result:
        del dicom_result.PixelPaddingRangeLimit

    # Memasukkan data piksel
    pixel_data = image.astype(np.uint8).tobytes()

    # DICOM PixelData harus memiliki panjang byte genap
    if len(pixel_data) % 2 != 0:
        pixel_data += b"\x00"

    dicom_result.PixelData = pixel_data

    # Memperbarui informasi transfer syntax
    dicom_result.file_meta.TransferSyntaxUID = (
        pydicom.uid.ExplicitVRLittleEndian
    )

    # Menyimpan file DICOM
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
    Menyimpan enam hasil enhancement dalam format PNG dan DICOM.
    """

    output_directory = Path(output_directory)
    output_directory.mkdir(parents=True, exist_ok=True)

    # Mengambil nama dasar file yang diunggah
    from werkzeug.utils import secure_filename

    safe_filename = secure_filename(
        Path(original_filename).stem
    )

    if not safe_filename:
        safe_filename = "ct_mastoid"

    saved_files = {}

    for result_name in RESULT_NAMES:

        if result_name not in results:
            raise ValueError(
                f"Hasil enhancement {result_name} tidak ditemukan"
            )

        # Menyiapkan gambar
        image = prepare_image(
            results[result_name],
            result_name
        )

        # Nama file PNG
        png_filename = (
            f"{safe_filename}_{result_name}.png"
        )

        # Nama file DICOM
        dicom_filename = (
            f"{safe_filename}_{result_name}.dcm"
        )

        png_path = output_directory / png_filename
        dicom_path = output_directory / dicom_filename

        # Menyimpan PNG
        save_as_png(
            image,
            png_path
        )

        # Menyimpan DICOM
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

    return saved_files