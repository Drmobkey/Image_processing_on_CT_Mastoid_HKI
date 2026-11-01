import pydicom
import numpy as np
from scipy.signal import convolve2d


# ==========================================
# 1. MEMBACA DAN MEMVALIDASI FILE DICOM
# ==========================================

def read_dicom(file_path):
    """
    Membaca file DICOM dan memvalidasi kelayakannya.
    """
    dicom_data = pydicom.dcmread(file_path, force=True)
    validate_dicom(dicom_data)
    return dicom_data


def validate_dicom(dicom_data):
    """
    Memvalidasi ketersediaan data pada file DICOM.
    Mendukung modalitas CT secara optimal, serta tetap menerima modalitas lain
    (CR, MR, DX, OT) secara fleksibel agar semua file DICOM dapat diproses.
    """
    if dicom_data is None:
        raise ValueError("File DICOM tidak dapat dibaca atau rusak.")
    return True


def validate_pixel_array(pixel_array):
    """
    Memvalidasi dan menormalkan dimensi matriks piksel DICOM ke citra grayscale 2D.
    Mendukung citra 2D, 3D multi-frame, maupun format citra RGB (3 channel).
    """
    if pixel_array is None or pixel_array.size == 0:
        raise ValueError("Matriks piksel DICOM kosong.")

    # 1. Jika citra berbentuk RGB atau RGBA (misal shape (H, W, 3) atau (H, W, 4))
    if pixel_array.ndim == 3 and pixel_array.shape[2] in (3, 4):
        r = pixel_array[:, :, 0].astype(np.float32)
        g = pixel_array[:, :, 1].astype(np.float32)
        b = pixel_array[:, :, 2].astype(np.float32)
        pixel_array = (0.299 * r + 0.587 * g + 0.114 * b)

    # 2. Jika citra berdimensi single-frame (1, H, W)
    elif pixel_array.ndim == 3 and pixel_array.shape[0] == 1:
        pixel_array = pixel_array[0]

    # 3. Jika citra berdimensi (H, W, 1)
    elif pixel_array.ndim == 3 and pixel_array.shape[2] == 1:
        pixel_array = pixel_array[:, :, 0]

    # 4. Jika citra multi-frame 3D (N, H, W), ambil frame tengah
    elif pixel_array.ndim == 3:
        mid_idx = pixel_array.shape[0] // 2
        pixel_array = pixel_array[mid_idx]

    if pixel_array.ndim != 2:
        raise ValueError(
            f"Citra DICOM tidak dapat dikonversi ke grayscale 2D (dimensi: {pixel_array.shape})"
        )

    return pixel_array


# ==========================================
# 2. MENGAMBIL METADATA DICOM
# ==========================================

def get_dicom_metadata(dicom_data):
    """
    Mengambil metadata penting dari file DICOM secara aman dan serializable (JSON safe).
    """
    def safe_numeric(val, default=None):
        if val is None:
            return default
        # Menangani pydicom MultiValue atau tuple/list
        if hasattr(val, "__iter__") and not isinstance(val, (str, bytes)):
            try:
                items = list(val)
                val = items[0] if items else default
            except Exception:
                return default
        if val is None:
            return default
        try:
            val_float = float(val)
            if val_float.is_integer():
                return int(val_float)
            return val_float
        except (ValueError, TypeError):
            return str(val)

    metadata = {
        "modality": str(getattr(dicom_data, "Modality", "")) or "CT",
        "rows": safe_numeric(getattr(dicom_data, "Rows", None)),
        "columns": safe_numeric(getattr(dicom_data, "Columns", None)),
        "rescale_slope": safe_numeric(getattr(dicom_data, "RescaleSlope", 1), default=1),
        "rescale_intercept": safe_numeric(getattr(dicom_data, "RescaleIntercept", 0), default=0),
        "window_width": safe_numeric(getattr(dicom_data, "WindowWidth", None)),
        "window_center": safe_numeric(getattr(dicom_data, "WindowCenter", None))
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
    pixel_array = validate_pixel_array(pixel_array)
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

    try:
        slope = float(rescale_slope) if rescale_slope is not None else 1.0
    except (ValueError, TypeError):
        slope = 1.0

    try:
        intercept = float(rescale_intercept) if rescale_intercept is not None else 0.0
    except (ValueError, TypeError):
        intercept = 0.0

    hu_image = (
        pixel_array * slope
        + intercept
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
