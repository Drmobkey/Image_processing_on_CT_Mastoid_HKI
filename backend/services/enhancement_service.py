import numpy as np

from services.dicom_service import (
    apply_window_level,
    apply_contrast_enhancement,
    apply_high_pass_filter
)


# ==========================================
# MATRIKS HPF SESUAI PDF PENELITIAN
# ==========================================

KERNEL_1 = np.array([
    [-1, -1, -1],
    [-1,  8, -1],
    [-1, -1, -1]
])

KERNEL_2 = np.array([
    [ 0, -1,  0],
    [-1,  5, -1],
    [ 0, -1,  0]
])

KERNEL_3 = np.array([
    [ 1, -2,  1],
    [-2,  5, -2],
    [ 1, -2,  1]
])


KERNELS = {
    "hpf_1": KERNEL_1,
    "hpf_2": KERNEL_2,
    "hpf_3": KERNEL_3
}


# ==========================================
# FUNGSI FUSION MULTI-KERNEL
# ==========================================

def apply_multi_kernel_fusion(windowed_image, hpf_results, selected_kernels):

    if not selected_kernels:
        raise ValueError(
            "Pilih minimal satu kernel untuk proses fusion"
        )

    fusion = windowed_image.astype(np.int32)

    for kernel_name in selected_kernels:

        if kernel_name not in hpf_results:
            raise ValueError(
                f"Hasil {kernel_name} tidak tersedia"
            )

        fusion += hpf_results[kernel_name].astype(np.int32)

    fusion = np.clip(fusion, 0, 255)

    return fusion.astype(np.uint8)


# ==========================================
# MODE PENELITIAN
# ==========================================

def research_mode(hu_image):

    # Windowing sesuai PDF
    windowed_image = apply_window_level(
        hu_image,
        window_width=2000,
        window_level=400
    )

    # Contrast enhancement
    contrast_image = apply_contrast_enhancement(
        windowed_image
    )

    # Tiga proses HPF
    hpf_results = {}

    for kernel_name, kernel in KERNELS.items():

        hpf_results[kernel_name] = apply_high_pass_filter(
            contrast_image,
            kernel
        )

    # Fusion sesuai implementasi PDF:
    # Windowed image + HPF Kernel 1
    fusion_image = apply_multi_kernel_fusion(
        windowed_image,
        hpf_results,
        ["hpf_1"]
    )

    return {
        "original": windowed_image,
        "contrast": contrast_image,
        "hpf_1": hpf_results["hpf_1"],
        "hpf_2": hpf_results["hpf_2"],
        "hpf_3": hpf_results["hpf_3"],
        "fusion": fusion_image
    }


# ==========================================
# MODE EKSPLORASI PENGGUNA
# ==========================================

def exploration_mode(
    hu_image,
    operations,
    window_width=2000,
    window_level=400,
    fusion_kernels=None,
    custom_kernel=None,
    contrast_min=0.2,
    contrast_max=0.9
):

    allowed_operations = {
        "windowing",
        "contrast",
        "hpf_1",
        "hpf_2",
        "hpf_3",
        "fusion",
        "custom_hpf"
    }

    operations = set(operations or [])

    invalid_operations = operations - allowed_operations

    if invalid_operations:
        raise ValueError(
            f"Proses tidak dikenal: {', '.join(sorted(invalid_operations))}"
        )

    # Windowing merupakan dasar seluruh proses
    windowed_image = apply_window_level(
        hu_image,
        window_width=window_width,
        window_level=window_level
    )

    results = {}

    if "windowing" in operations:
        results["original"] = windowed_image

    # Proses contrast diperlukan untuk HPF dan fusion
    needs_contrast = bool(
        operations.intersection({
            "contrast",
            "hpf_1",
            "hpf_2",
            "hpf_3",
            "fusion",
            "custom_hpf"
        })
    )

    contrast_image = None

    if needs_contrast:
        contrast_image = apply_contrast_enhancement(
            windowed_image,
            lower_input=contrast_min,
            upper_input=contrast_max
        )

    if "contrast" in operations:
        results["contrast"] = contrast_image

    # Menjalankan hanya kernel yang dipilih
    hpf_results = {}

    for kernel_name, kernel in KERNELS.items():

        if kernel_name in operations:

            hpf_results[kernel_name] = apply_high_pass_filter(
                contrast_image,
                kernel
            )

            results[kernel_name] = hpf_results[kernel_name]

    # Kernel kustom (3×3) jika pengguna menyediakan
    if "custom_hpf" in operations and custom_kernel is not None:
        hpf_results["custom_hpf"] = apply_high_pass_filter(
            contrast_image,
            custom_kernel
        )
        results["custom_hpf"] = hpf_results["custom_hpf"]

    # Fusion dapat menggunakan satu atau beberapa kernel
    if "fusion" in operations:

        fusion_kernels = fusion_kernels or []

        if not fusion_kernels:
            raise ValueError(
                "Pilih minimal satu kernel untuk fusion"
            )

        if len(set(fusion_kernels)) != len(fusion_kernels):
            raise ValueError(
                "Pilihan kernel fusion tidak boleh duplikat"
            )

        valid_fusion_kernels = set(KERNELS.keys()) | (
            {"custom_hpf"} if custom_kernel is not None else set()
        )
        invalid_kernels = (
            set(fusion_kernels) - valid_fusion_kernels
        )

        if invalid_kernels:
            raise ValueError(
                "Terdapat pilihan kernel fusion yang tidak valid"
            )

        # Pastikan kernel fusion juga diproses
        for kernel_name in fusion_kernels:

            if kernel_name not in hpf_results:

                if kernel_name == "custom_hpf" and custom_kernel is not None:
                    hpf_results[kernel_name] = apply_high_pass_filter(
                        contrast_image,
                        custom_kernel
                    )
                elif kernel_name in KERNELS:
                    hpf_results[kernel_name] = apply_high_pass_filter(
                        contrast_image,
                        KERNELS[kernel_name]
                    )

                results[kernel_name] = hpf_results[kernel_name]

        fusion_image = apply_multi_kernel_fusion(
            windowed_image,
            hpf_results,
            fusion_kernels
        )

        fusion_name = "fusion_" + "_".join(fusion_kernels)

        results[fusion_name] = fusion_image

    if not results:
        raise ValueError(
            "Pilih minimal satu proses image enhancement"
        )

    return results


# ==========================================
# FUNGSI UTAMA
# ==========================================

def enhance_image(
    hu_image,
    mode="research",
    operations=None,
    window_width=2000,
    window_level=400,
    fusion_kernels=None,
    custom_kernel=None,
    contrast_min=0.2,
    contrast_max=0.9
):

    if mode == "research":

        return research_mode(hu_image)

    elif mode == "exploration":

        return exploration_mode(
            hu_image=hu_image,
            operations=operations,
            window_width=window_width,
            window_level=window_level,
            fusion_kernels=fusion_kernels,
            custom_kernel=custom_kernel,
            contrast_min=contrast_min,
            contrast_max=contrast_max
        )

    else:

        raise ValueError(
            "Mode harus research atau exploration"
        )