import numpy as np
from services.dicom_service import (
    apply_window_level,
    apply_contrast_enhancement,
    apply_high_pass_filter,
    apply_image_fusion
)

# High Pass Filter Kernel 1
KERNEL_1 = np.array([
    [-1, -1, -1],
    [-1,  8, -1],
    [-1, -1, -1]
])

# High Pass Filter Kernel 2
KERNEL_2 = np.array([
    [ 0, -1,  0],
    [-1,  5, -1],
    [ 0, -1,  0]
])

# High Pass Filter Kernel 3
KERNEL_3 = np.array([
    [ 1, -2,  1],
    [-2,  5, -2],
    [ 1, -2,  1]
])


def enhance_image(hu_image):
    """
    Menjalankan seluruh tahapan image enhancement
    pada citra CT Mastoid.
    """

    # 1. Window Width dan Window Level
    windowed_image = apply_window_level(
        hu_image,
        window_width=2000,
        window_level=400
        )
    


    # 2. Contrast Enhancement
    contrast_image = apply_contrast_enhancement(
        windowed_image,
    )


    # 3. High Pass Filter
    hpf_1 = apply_high_pass_filter(
        contrast_image,
        KERNEL_1
    )

    hpf_2 = apply_high_pass_filter(
        contrast_image,
        KERNEL_2
    )

    hpf_3 = apply_high_pass_filter(
        contrast_image,
        KERNEL_3
    )


    # 4. Image Fusion
    fusion_image = apply_image_fusion(
        windowed_image,
        hpf_1
    )


    # 5. Mengembalikan seluruh hasil
    return {
        "original": hu_image,
        "contrast": contrast_image,
        "hpf_1": hpf_1,
        "hpf_2": hpf_2,
        "hpf_3": hpf_3,
        "fusion": fusion_image
    }