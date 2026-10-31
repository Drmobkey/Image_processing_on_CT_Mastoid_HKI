import pydicom
import numpy as np
from scipy.signal import convolve2d


# ==========================================
# 1. MEMBACA DAN MEMVALIDASI FILE DICOM
# ==========================================

def read_dicom(file_path):
    """
    Membaca file DICOM dan memvalidasi modalitasnya.
    """

    dicom_data = pydicom.dcmread(file_path)

    validate_dicom(dicom_data)

    return dicom_data


def validate_dicom(dicom_data):
    """
    Memvalidasi apakah file DICOM merupakan citra CT.
    """

    modality = getattr(dicom_data, "Modality", None)

    if modality != "CT":
        raise ValueError(
            "File DICOM harus memiliki modality CT"
        )

    return True


def validate_pixel_array(pixel_array):
    """
    Memvalidasi dimensi matriks piksel DICOM.
    """

    if pixel_array.ndim != 2:
        raise ValueError(
            "Citra DICOM harus berupa citra grayscale 2D"
        )

    if pixel_array.size == 0:
        raise ValueError(
            "Matriks piksel DICOM kosong"
        )

    return True


# ==========================================
# 2. MENGAMBIL METADATA DICOM
# ==========================================

def get_dicom_metadata(dicom_data):
    """
    Mengambil metadata penting dari file DICOM.
    """

    metadata = {
        "modality": getattr(dicom_data, "Modality", None),
        "rows": getattr(dicom_data, "Rows", None),
        "columns": getattr(dicom_data, "Columns", None),
        "rescale_slope": getattr(dicom_data, "RescaleSlope", 1),
        "rescale_intercept": getattr(dicom_data, "RescaleIntercept", 0),
        "window_width": getattr(dicom_data, "WindowWidth", None),
        "window_center": getattr(dicom_data, "WindowCenter", None)
    }

    return metadata


# ==========================================
# 3. MENGAMBIL MATRIKS PIKSEL
# ==========================================

def get_dicom_pixel_array(dicom_data):
    """
    Mengambil dan memvalidasi matriks piksel DICOM.
    """

    pixel_array = dicom_data.pixel_array

    validate_pixel_array(pixel_array)

    return pixel_array


# ==========================================
# 4. KONVERSI PIXEL KE HOUNSFIELD UNIT
# ==========================================

def convert_to_hu(pixel_array, rescale_slope, rescale_intercept):
    """
    Mengonversi nilai piksel DICOM CT menjadi HU.
    """

    pixel_array = np.asarray(
        pixel_array,
        dtype=np.float32
    )

    hu_image = (
        pixel_array * float(rescale_slope)
        + float(rescale_intercept)
    )

    return hu_image


# ==========================================
# 5. WINDOW WIDTH DAN WINDOW LEVEL
# ==========================================

def apply_window_level(
    hu_image,
    window_width=2000,
    window_level=400
):
    """
    Melakukan Window Width dan Window Level
    berdasarkan algoritma pada modul penelitian.
    """

    lower_limit = window_level - (window_width / 2)
    upper_limit = window_level + (window_width / 2)

    clipped_image = np.clip(
        hu_image,
        lower_limit,
        upper_limit
    )

    min_value = clipped_image.min()
    max_value = clipped_image.max()

    if max_value == min_value:
        return np.zeros(
            clipped_image.shape,
            dtype=np.uint8
        )

    normalized_image = (
        (clipped_image - min_value)
        / (max_value - min_value)
    )

    result_image = (
        255 * normalized_image
    ).astype(np.uint8)

    return result_image


# ==========================================
# 6. CONTRAST ENHANCEMENT
# ==========================================

def apply_contrast_enhancement(image):
    """
    Meningkatkan kontras citra menggunakan
    prinsip imadjust MATLAB.
    """

    normalized_image = (
        image.astype(np.float32) / 255.0
    )

    lower_input = 0.2
    upper_input = 0.9

    clipped_image = np.clip(
        normalized_image,
        lower_input,
        upper_input
    )

    adjusted_image = (
        (clipped_image - lower_input)
        / (upper_input - lower_input)
    )

    result_image = (
        adjusted_image * 255
    ).astype(np.uint8)

    return result_image


# ==========================================
# 7. HIGH PASS FILTER
# ==========================================

def apply_high_pass_filter(image, kernel):
    """
    Menerapkan High Pass Filter menggunakan
    konvolusi 2D.
    """

    image = np.asarray(
        image,
        dtype=np.float64
    )

    filtered_image = convolve2d(
        image,
        kernel,
        mode="same",
        boundary="fill",
        fillvalue=0
    )

    filtered_image = np.clip(
        filtered_image,
        0,
        255
    )

    result_image = np.floor(
        filtered_image + 0.5
    ).astype(np.uint8)

    return result_image


# ==========================================
# 8. IMAGE FUSION
# ==========================================

def apply_image_fusion(original_image, filtered_image):
    """
    Menggabungkan citra hasil windowing dengan
    citra hasil High Pass Filter Kernel 1.
    """

    original_image = np.asarray(
        original_image,
        dtype=np.uint16
    )

    filtered_image = np.asarray(
        filtered_image,
        dtype=np.uint16
    )

    if original_image.shape != filtered_image.shape:
        raise ValueError(
            "Ukuran kedua citra harus sama"
        )

    fused_image = (
        original_image + filtered_image
    )

    fused_image = np.clip(
        fused_image,
        0,
        255
    )

    return fused_image.astype(np.uint8)