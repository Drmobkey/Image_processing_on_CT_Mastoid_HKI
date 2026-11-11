"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  XCircle,
  Check,
  AlertCircle,
  Download,
  FileDown,
  SlidersHorizontal,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3x3,
  Sliders,
  CheckSquare,
  Square,
  HelpCircle
} from "lucide-react";

// Tipe data hasil proses per item dari backend
interface ProcessResultItem {
  png: string;
  dicom: string;
  shape: number[];
  dtype: string;
  preview_url: string;
  download_png_url: string;
  download_dicom_url: string;
}

// Tipe metadata DICOM dari backend
interface DicomMetadata {
  modality: string | null;
  rows: number | null;
  columns: number | null;
  rescale_slope: number;
  rescale_intercept: number;
  window_width: number | null;
  window_center: number | null;
}

export default function MastoidLabApp() {
  // Helper mendapatkan URL backend utama dan fallback
  const getApiUrls = (): string[] => {
    const urls: string[] = [];
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname || "localhost";
      // Gunakan hostname yang sama dengan yang diakses pengguna di browser (misal: 192.168.1.36, localhost, atau 127.0.0.1)
      const currentHostApi = `http://${hostname}:5001`;
      urls.push(currentHostApi);
      if (hostname !== "localhost") urls.push("http://localhost:5001");
      if (hostname !== "127.0.0.1") urls.push("http://127.0.0.1:5001");
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
      const envUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
      if (!urls.includes(envUrl)) urls.push(envUrl);
    }
    if (urls.length === 0) {
      urls.push("http://127.0.0.1:5001", "http://localhost:5001");
    }
    return urls;
  };

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5001";

  // State File & Navigasi
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<{
    name: string;
    size: string;
    dimensions: string;
    windowWidth: number;
    windowLevel: number;
    modality: string;
  } | null>(null);

  // ==========================================
  // STATE MODE 1 & MODE 2
  // ==========================================
  const [processingMode, setProcessingMode] = useState<"research" | "exploration">(
    "research"
  );
  const [customWW, setCustomWW] = useState<number>(2000);
  const [customWL, setCustomWL] = useState<number>(400);

  // Mode 1: Metode Aktif yang difokuskan saat melihat hasil
  const [selectedResearchMethod, setSelectedResearchMethod] = useState<string>("kontras");

  // Mode 2: Eksplorasi Bebas Pengguna
  // Pengguna bebas memilih proses mana yang aktif
  const [explorationOps, setExplorationOps] = useState<{
    contrast: boolean;
    hpf_1: boolean;
    hpf_2: boolean;
    hpf_3: boolean;
    fusion: boolean;
  }>({
    contrast: true,
    hpf_1: true,
    hpf_2: true,
    hpf_3: true,
    fusion: true,
  });

  // Mode 2: Kernel yang digunakan untuk Fusi (Kernel 1, Kernel 2, atau Kernel 3)
  const [fusionTarget, setFusionTarget] = useState<string>("hpf1");

  // Mode 2: Fitur Tambahan Matriks Filter Kustom (3×3)
  const [showCustomMatrix, setShowCustomMatrix] = useState<boolean>(false);
  const [useCustomKernel, setUseCustomKernel] = useState<boolean>(false);
  const [customMatrix, setCustomMatrix] = useState<number[][]>([
    [-1, -1, -1],
    [-1, 8, -1],
    [-1, -1, -1],
  ]);
  const [matrixPreset, setMatrixPreset] = useState<string>("kernel_1");

  // Mode 2: Parameter Contrast Kustom
  const [contrastMin, setContrastMin] = useState<number>(0.2);
  const [contrastMax, setContrastMax] = useState<number>(0.9);

  // State Hasil Backend
  const [resultsData, setResultsData] = useState<Record<string, ProcessResultItem> | null>(null);
  const [activeResultKey, setActiveResultKey] = useState<string>("contrast");

  // State Zoom Page 2 & Page 3
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [zoomLevelP3, setZoomLevelP3] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // State Status Unggah & Pemrosesan
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string>("");

  const [processStatus, setProcessStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [processError, setProcessError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hitung jumlah bobot matriks kustom
  const customMatrixSum = useMemo(() => {
    return customMatrix.flat().reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  }, [customMatrix]);

  // State untuk menampilkan matriks kernel pada kartu
  const [showMatrixCard, setShowMatrixCard] = useState<Record<string, boolean>>({
    hp1: false,
    hp2: false,
    hp3: false,
  });

  const toggleShowMatrix = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMatrixCard((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // Metode Pemrosesan dengan Aksen Dark Theme Berwarna (Sesuai Desain Asli)
  const methods = [
    {
      id: "kontras",
      backendKey: "contrast",
      title: "Peningkatan Kontras",
      desc: "Perjelas perbedaan densitas intensitas tulang mastoid.",
      colorBadge: "bg-amber-950/80 text-amber-300 border-amber-500/40",
      activeRing: "border-amber-500/80 bg-amber-950/20 shadow-amber-900/30",
      dotColor: "bg-amber-400",
      matrix: null,
      matrixNote: null,
    },
    {
      id: "hp1",
      backendKey: "hpf_1",
      title: "High-Pass Filter · Kernel 1",
      desc: "Tonjolkan detail tepi kanalis dan trabekula mastoid.",
      colorBadge: "bg-sky-950/80 text-sky-300 border-sky-500/40",
      activeRing: "border-sky-500/80 bg-sky-950/20 shadow-sky-900/30",
      dotColor: "bg-sky-400",
      matrix: [
        [-1, -1, -1],
        [-1,  8, -1],
        [-1, -1, -1]
      ],
      matrixNote: "Laplacian 8-Arah (Omnidirectional Edge)",
    },
    {
      id: "hp2",
      backendKey: "hpf_2",
      title: "High-Pass Filter · Kernel 2",
      desc: "Pertajam batas sklerotik dengan matriks kernel 2.",
      colorBadge: "bg-indigo-950/80 text-indigo-300 border-indigo-500/40",
      activeRing: "border-indigo-500/80 bg-indigo-950/20 shadow-indigo-900/30",
      dotColor: "bg-indigo-400",
      matrix: [
        [ 0, -1,  0],
        [-1,  5, -1],
        [ 0, -1,  0]
      ],
      matrixNote: "Laplacian 4-Arah (Crisp Edge)",
    },
    {
      id: "hp3",
      backendKey: "hpf_3",
      title: "High-Pass Filter · Kernel 3",
      desc: "Penajaman frekuensi tinggi untuk detail mikro tulang.",
      colorBadge: "bg-purple-950/80 text-purple-300 border-purple-500/40",
      activeRing: "border-purple-500/80 bg-purple-950/20 shadow-purple-900/30",
      dotColor: "bg-purple-400",
      matrix: [
        [ 1, -2,  1],
        [-2,  5, -2],
        [ 1, -2,  1]
      ],
      matrixNote: "Diagonal High-Pass (Mikro-Struktur)",
    },
    {
      id: "fusi",
      backendKey: "fusion",
      title: "Fusi Citra",
      desc: "Rekonstruksi leburan citra asli dengan citra filter.",
      colorBadge: "bg-teal-950/80 text-teal-300 border-teal-500/40",
      activeRing: "border-teal-500/80 bg-teal-950/20 shadow-teal-900/30",
      dotColor: "bg-teal-400",
      matrix: null,
      matrixNote: null,
    },
  ];

  const originalPreviewUrl = resultsData?.original?.preview_url || null;

  const activeResultPreviewUrl =
    (resultsData && resultsData[activeResultKey]?.preview_url) ||
    resultsData?.fusion?.preview_url ||
    resultsData?.contrast?.preview_url ||
    null;

  // Zoom Handler Page 2
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  // Zoom Handler Page 3
  const handleZoomInP3 = () => setZoomLevelP3((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOutP3 = () => setZoomLevelP3((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoomP3 = () => setZoomLevelP3(1);

  // 1. FUNGSI UNGGAH FILE (STEP 1)
  const processUploadFile = (file: File) => {
    if (!file) return;

    setUploadError("");
    setUploadProgress(0);

    const fileNameLower = file.name.toLowerCase();
    const isDicomExt = fileNameLower.endsWith(".dcm") || fileNameLower.endsWith(".dicom");
    if (!isDicomExt && file.name.includes(".")) {
      setUploadStatus("error");
      setUploadError(
        `Format berkas "${file.name}" tidak didukung. Harap unggah berkas dengan ekstensi .dcm atau .dicom (CT Mastoid).`
      );
      return;
    }

    setRawFile(file);
    setUploadStatus("uploading");

    const urls = getApiUrls();
    let urlIndex = 0;

    const tryUploadWithUrl = (targetBaseUrl: string) => {
      console.log(`[DRiP] Mencoba mengunggah ke: ${targetBaseUrl}/upload`);
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "research");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        try {
          const response = JSON.parse(xhr.responseText);

          if (xhr.status >= 200 && xhr.status < 300 && response.status === "success") {
            setUploadProgress(100);
            setUploadStatus("success");

            const meta: DicomMetadata = response.metadata || {};
            const ww = meta.window_width || 2000;
            const wl = meta.window_center || 400;

            setFileData({
              name: file.name,
              size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
              dimensions: `${meta.rows || 512} x ${meta.columns || 512} px`,
              windowWidth: ww,
              windowLevel: wl,
              modality: meta.modality || "CT",
            });

            setCustomWW(ww);
            setCustomWL(wl);
            setResultsData(response.results);
            setActiveResultKey("contrast");

            setTimeout(() => setCurrentStep(2), 400);
          } else {
            setUploadStatus("error");
            setUploadError(
              response.message ||
              "Gagal memproses file DICOM. Pastikan file valid dengan modalitas CT."
            );
          }
        } catch (err) {
          console.error("[DRiP] Gagal parse JSON respons backend:", err);
          setUploadStatus("error");
          setUploadError("Gagal membaca respons dari server backend.");
        }
      };

      xhr.onerror = (e) => {
        console.warn(`[DRiP] Gagal terhubung ke ${targetBaseUrl}:`, e);
        urlIndex += 1;
        if (urlIndex < urls.length) {
          console.log(`[DRiP] Mencoba URL alternatif: ${urls[urlIndex]}`);
          tryUploadWithUrl(urls[urlIndex]);
        } else {
          setUploadStatus("error");
          setUploadError(
            `Tidak dapat terhubung ke server backend di ${urls.join(" atau ")}. Pastikan server backend Flask aktif dan tidak terhalang (misal: jalankan 'python app.py').`
          );
        }
      };

      xhr.open("POST", `${targetBaseUrl}/upload`);
      xhr.send(formData);
    };

    tryUploadWithUrl(urls[0]);
  };

  // 2. FUNGSI PEMROSESAN CITRA (STEP 2 -> STEP 3)
  const handleProcessImage = () => {
    if (!rawFile) {
      setProcessError("Berkas DICOM belum diunggah.");
      return;
    }

    setProcessStatus("processing");
    setProcessProgress(0);
    setProcessError("");

    let progress = 10;
    const progressInterval = setInterval(() => {
      progress = Math.min(progress + 20, 90);
      setProcessProgress(progress);
    }, 120);

    const formData = new FormData();
    formData.append("file", rawFile);

    const urls = getApiUrls();
    const targetUrl = `${urls[0]}/upload`;

    if (processingMode === "research") {
      // MODE 1: MODUL PENELITIAN BAKU (WW 2000, WL 400, Kontras, HPF 1-2-3, Fusi Kernel 1)
      formData.append("mode", "research");

      fetch(targetUrl, {
        method: "POST",
        body: formData,
      })
        .then(async (res) => {
          clearInterval(progressInterval);
          const data = await res.json();
          if (res.ok && data.status === "success") {
            setProcessProgress(100);
            setProcessStatus("success");
            setResultsData(data.results);

            // Fokus ke metode yang dipilih
            if (selectedResearchMethod === "kontras") setActiveResultKey("contrast");
            else if (selectedResearchMethod === "hp1") setActiveResultKey("hpf_1");
            else if (selectedResearchMethod === "hp2") setActiveResultKey("hpf_2");
            else if (selectedResearchMethod === "hp3") setActiveResultKey("hpf_3");
            else if (selectedResearchMethod === "fusi") setActiveResultKey("fusion");
            else setActiveResultKey("contrast");

            setTimeout(() => setCurrentStep(3), 400);
          } else {
            setProcessStatus("error");
            setProcessError(data.message || "Gagal memproses citra mode penelitian.");
          }
        })
        .catch((err) => {
          clearInterval(progressInterval);
          setProcessStatus("error");
          setProcessError(`Gagal terhubung ke backend: ${err.message || "Network Error"}`);
        });
    } else {
      // MODE 2: EKSPLORASI PENGGUNA BEBAS MEMILIH
      formData.append("mode", "exploration");
      formData.append("window_width", customWW.toString());
      formData.append("window_level", customWL.toString());

      // Parameter contrast kustom
      formData.append("contrast_min", contrastMin.toString());
      formData.append("contrast_max", contrastMax.toString());

      // Kumpulkan operasi yang dipilih pengguna
      const operations: string[] = ["windowing"];
      if (explorationOps.contrast) operations.push("contrast");
      if (explorationOps.hpf_1) operations.push("hpf_1");
      if (explorationOps.hpf_2) operations.push("hpf_2");
      if (explorationOps.hpf_3) operations.push("hpf_3");
      if (explorationOps.fusion) operations.push("fusion");
      // Tambahkan custom_hpf jika kernel kustom diaktifkan
      if (useCustomKernel) operations.push("custom_hpf");

      if (operations.length === 1 && !explorationOps.contrast && !explorationOps.hpf_1 && !explorationOps.hpf_2 && !explorationOps.hpf_3 && !explorationOps.fusion && !useCustomKernel) {
        clearInterval(progressInterval);
        setProcessStatus("error");
        setProcessError("Pilih minimal satu proses enhancement (Kontras, HPF, Kernel Kustom, atau Fusi).");
        return;
      }

      formData.append("operations", JSON.stringify(operations));

      // Kirim kernel kustom jika diaktifkan
      if (useCustomKernel) {
        formData.append("custom_kernel", JSON.stringify(customMatrix));
      }

      // Kernel untuk Fusi
      let fusionKernels = ["hpf_1"];
      if (fusionTarget === "hpf2") fusionKernels = ["hpf_2"];
      if (fusionTarget === "hpf3") fusionKernels = ["hpf_3"];
      if (fusionTarget === "custom") fusionKernels = ["custom_hpf"];
      formData.append("fusion_kernels", JSON.stringify(fusionKernels));

      fetch(targetUrl, {
        method: "POST",
        body: formData,
      })
        .then(async (res) => {
          clearInterval(progressInterval);
          const data = await res.json();
          if (res.ok && data.status === "success") {
            setProcessProgress(100);
            setProcessStatus("success");
            setResultsData(data.results);

            // Tentukan key hasil awal
            const availableKeys = Object.keys(data.results);
            const fusionKey = availableKeys.find((k) => k.startsWith("fusion"));
            if (explorationOps.fusion && fusionKey) {
              setActiveResultKey(fusionKey);
            } else if (useCustomKernel && availableKeys.includes("custom_hpf")) {
              setActiveResultKey("custom_hpf");
            } else if (availableKeys.includes("contrast") && explorationOps.contrast) {
              setActiveResultKey("contrast");
            } else if (availableKeys.length > 0) {
              setActiveResultKey(availableKeys[0]);
            }

            setTimeout(() => setCurrentStep(3), 400);
          } else {
            setProcessStatus("error");
            setProcessError(data.message || "Gagal memproses citra mode eksplorasi.");
          }
        })
        .catch((err) => {
          clearInterval(progressInterval);
          setProcessStatus("error");
          setProcessError(`Gagal terhubung ke backend: ${err.message || "Network Error"}`);
        });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadFile(file);
    // Reset nilai input agar dapat memilih file yang sama berulang kali
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) processUploadFile(files[0]);
  };

  const handleReset = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setRawFile(null);
    setFileData(null);
    setResultsData(null);
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadError("");
    setProcessStatus("idle");
    setProcessProgress(0);
    setProcessError("");
    setProcessingMode("research");
    setCurrentStep(1);
    setZoomLevel(1);
    setZoomLevelP3(1);
    setUseCustomKernel(false);
    setContrastMin(0.2);
    setContrastMax(0.9);
  };

  const handleDownload = (format: "png" | "dicom") => {
    if (!resultsData) return;
    const currentItem =
      resultsData[activeResultKey] ||
      resultsData["fusion"] ||
      resultsData["contrast"] ||
      Object.values(resultsData)[0];
    if (!currentItem) return;

    const downloadUrl =
      format === "png"
        ? currentItem.download_png_url
        : currentItem.download_dicom_url;

    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  // Toggle operasi di Mode 2 (Eksplorasi)
  const toggleExplorationOp = (key: "contrast" | "hpf_1" | "hpf_2" | "hpf_3" | "fusion") => {
    setExplorationOps((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Preset matriks kustom
  const applyMatrixPreset = (preset: string) => {
    setMatrixPreset(preset);
    if (preset === "kernel_1") {
      setCustomMatrix([
        [-1, -1, -1],
        [-1, 8, -1],
        [-1, -1, -1]
      ]);
    } else if (preset === "kernel_2") {
      setCustomMatrix([
        [0, -1, 0],
        [-1, 5, -1],
        [0, -1, 0]
      ]);
    } else if (preset === "kernel_3") {
      setCustomMatrix([
        [1, -2, 1],
        [-2, 5, -2],
        [1, -2, 1]
      ]);
    } else if (preset === "high_boost") {
      setCustomMatrix([
        [-1, -1, -1],
        [-1, 9, -1],
        [-1, -1, -1]
      ]);
    }
  };

  const updateMatrixCell = (row: number, col: number, val: string) => {
    const num = parseFloat(val) || 0;
    const updated = customMatrix.map((r, rIdx) =>
      r.map((c, cIdx) => (rIdx === row && cIdx === col ? num : c))
    );
    setCustomMatrix(updated);
    setMatrixPreset("custom");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#090D16] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950/25 via-[#090D16] to-[#06080F] px-6 md:px-12 py-6 text-slate-100">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        onClick={(e) => {
          (e.target as HTMLInputElement).value = "";
        }}
        accept=".dcm,.dicom"
        className="hidden"
      />

      {/* HEADER SECTION */}
      <header>
        <div className="flex justify-between items-start border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              {/* Judul Halaman Menggunakan Font RIGHTEOUS */}
              <h1 className="text-3xl font-normal tracking-wider bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent font-[family-name:var(--font-righteous)]">
                DRiP
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Digital Radiology Image Processing
            </p>
          </div>

          <div className="flex flex-col items-end gap-2.5">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              Alat Penelitian & HKI
            </span>

            {currentStep === 2 && (
              <span className="bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 size={14} className="text-emerald-400" />
                File Berhasil Diunggah
              </span>
            )}
            {currentStep === 3 && (
              <span className="bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 size={14} className="text-cyan-400" />
                Pemrosesan Selesai
              </span>
            )}
          </div>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="flex justify-between items-center py-4 text-xs font-semibold border-b border-slate-800/80 mb-8">
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-teal-600 to-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-mono font-bold shadow-md shadow-teal-500/20">
              0{currentStep} / 03
            </span>
            <span className="text-slate-400 font-medium hidden sm:inline">
              Tahap Eksekusi
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <button
              onClick={handleReset}
              className={`transition cursor-pointer px-2.5 py-1 rounded-lg ${currentStep === 1
                ? "bg-slate-800 text-teal-300 font-bold border border-teal-500/40 shadow-sm"
                : "hover:text-slate-200"
                }`}
            >
              1. Unggah Citra
            </button>
            <span className="text-slate-600">•</span>
            <button
              disabled={!fileData}
              onClick={() => fileData && setCurrentStep(2)}
              className={`transition px-2.5 py-1 rounded-lg ${fileData
                ? "cursor-pointer hover:text-slate-200"
                : "cursor-not-allowed opacity-40"
                } ${currentStep === 2
                  ? "bg-slate-800 text-teal-300 font-bold border border-teal-500/40 shadow-sm"
                  : ""
                }`}
            >
              2. Pilih Metode
            </button>
            <span className="text-slate-600">•</span>
            <button
              disabled={processStatus !== "success"}
              onClick={() => processStatus === "success" && setCurrentStep(3)}
              className={`transition px-2.5 py-1 rounded-lg ${processStatus === "success"
                ? "cursor-pointer hover:text-slate-200"
                : "cursor-not-allowed opacity-40"
                } ${currentStep === 3
                  ? "bg-slate-800 text-teal-300 font-bold border border-teal-500/40 shadow-sm"
                  : ""
                }`}
            >
              3. Tinjau Hasil
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* PAGE 1: UPLOAD CITRA (PERSIS SESUAI DESAIN SEBELUMNYA) */}
      {/* ========================================================================= */}
      <main className="flex-grow">
        {currentStep === 1 && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-teal-300 via-emerald-200 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                Explore Images. Enhance Details. Discover Insights.
              </h2>
              <p className="text-slate-400 text-lg max-w-5xl mx-auto pt-8">
                Platform pembelajaran interaktif untuk mengeksplorasi teknik pengelolaan citra radiologi digital melalui peningkatan kontras (contrast enhancement), pemfilteran citra (image filtering), dan fusi citra (image fusion). Aplikasi ini membantu mahasiswa memahami prinsip, proses, dan dampak setiap teknik terhadap karakteristik visual citra medis dari berbagai modalitas radiologi.
              </p>
              <p className="text-slate-400 text-sm max-w-3xl mx-auto pt-16">
                Unggah berkas DICOM CT Scan (.dcm), terapkan algoritma peningkatan kontras & penajaman frekuensi tinggi, lalu bandingkan hasilnya secara interaktif.
              </p>
            </div>

            {/* DROPZONE AREA */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-12 text-center space-y-4 transition-all duration-300 shadow-xl cursor-pointer ${isDragging
                ? "bg-teal-950/40 border-teal-400 scale-[1.01]"
                : "bg-[#0E1526]/80 border-slate-700/80 hover:border-teal-500/60 hover:bg-[#121B30]/80"
                }`}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-teal-500/25 pointer-events-none">
                <Upload className="w-7 h-7" />
              </div>

              {(uploadStatus === "idle" || uploadStatus === "success") && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-100 text-base">
                      Letakkan Berkas DICOM Mastoid di Sini
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tarik file langsung ke area ini atau klik untuk memilih file dari komputer Anda.
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white text-sm font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-teal-500/25 active:scale-95 cursor-pointer"
                    >
                      Pilih Berkas DICOM
                    </button>
                  </div>
                </div>
              )}

              {uploadStatus === "uploading" && (
                <div className="max-w-xs mx-auto space-y-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between text-xs font-semibold text-teal-300">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                      Memverifikasi format DICOM...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="bg-gradient-to-r from-teal-400 to-cyan-400 h-full rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Mengekstrak Hounsfield Unit (HU) dan dimensi matriks...
                  </p>
                </div>
              )}

              {uploadStatus === "error" && (
                <div className="max-w-md mx-auto space-y-3 py-3 bg-rose-950/40 p-5 rounded-2xl border border-rose-500/40 shadow-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-2 text-rose-300 font-semibold text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                    <span>Gagal mengunggah file.</span>
                  </div>
                  <p className="text-xs text-rose-300 leading-relaxed">{uploadError}</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition cursor-pointer"
                  >
                    Pilih File Lain
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-500 pt-2 font-mono">
                Format: .DCM / .DICOM • Modalitas: CT Scan Kepala / Tulang Mastoid
              </p>
            </div>

            {/* FITUR KARTU DARK MODE COLORFUL (TAHAP 01, TAHAP 02, TAHAP 03) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
              <div className="bg-[#0E1526]/80 p-5 rounded-2xl border-t-4 border-t-sky-400 border border-slate-800 shadow-lg space-y-2 hover:border-slate-700 transition">
                <span className="text-xs font-bold text-sky-300 bg-sky-950/80 border border-sky-800/60 px-2 py-0.5 rounded-md">
                  Tahap 01
                </span>
                <h4 className="font-bold text-sm text-slate-100">Unggah DICOM</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Unggah berkas CT asli dan sistem otomatis membaca metadata serta windowing baku tulang.
                </p>
              </div>

              <div className="bg-[#0E1526]/80 p-5 rounded-2xl border-t-4 border-t-indigo-400 border border-slate-800 shadow-lg space-y-2 hover:border-slate-700 transition">
                <span className="text-xs font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 px-2 py-0.5 rounded-md">
                  Tahap 02
                </span>
                <h4 className="font-bold text-sm text-slate-100">Metode & Kernel</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Terapkan High-Pass Filter dengan berbagai kernel teruji atau algoritma fusi citra.
                </p>
              </div>

              <div className="bg-[#0E1526]/80 p-5 rounded-2xl border-t-4 border-t-teal-400 border border-slate-800 shadow-lg space-y-2 hover:border-slate-700 transition">
                <span className="text-xs font-bold text-teal-300 bg-teal-950/80 border border-teal-800/60 px-2 py-0.5 rounded-md">
                  Tahap 03
                </span>
                <h4 className="font-bold text-sm text-slate-100">Komparasi & Ekspor</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Bandingkan citra asli dengan hasil filter lewat fitur zoom terkoordinasi dan unduh PNG/DICOM.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 2: PILIH METODE & PENGATURAN MODE */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-teal-300 via-emerald-200 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                  Atur Pemrosesan Citra
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {processingMode === "research"
                    ? "Mode 1: Menjalankan parameter baku modul penelitian (WW 2000, WL 400, Kontras, HPF 1-3, Fusi Kernel 1)."
                    : "Mode 2: Eksplorasi bebas — pilih proses, kernel HPF, target fusi, dan sesuaikan parameter WW & WL."}
                </p>
              </div>

              {/* Mode Pemrosesan Switcher */}
              <div className="inline-flex bg-slate-900/90 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto border border-slate-800">
                <button
                  type="button"
                  onClick={() => setProcessingMode("research")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${processingMode === "research"
                    ? "bg-teal-900/60 text-teal-200 border border-teal-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  Mode Penelitian (Baku)
                </button>
                <button
                  type="button"
                  onClick={() => setProcessingMode("exploration")}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${processingMode === "exploration"
                    ? "bg-teal-900/60 text-teal-200 border border-teal-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
                  Mode Eksplorasi
                </button>
              </div>
            </div>

            {/* ERROR BANNER */}
            {processStatus === "error" && (
              <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 flex items-start justify-between shadow-sm">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-400 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-200">Gagal Memproses Citra</h4>
                    <p className="text-xs text-rose-300 mt-0.5">{processError}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleProcessImage()}
                  className="flex items-center gap-1.5 text-xs bg-rose-600 text-white font-semibold px-3 py-1.5 hover:bg-rose-700 transition rounded-lg cursor-pointer"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  Coba Lagi
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* KOLOM KIRI: FILE PREVIEW */}
              <div className="lg:col-span-6 bg-[#0E1526]/80 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-teal-950/80 text-teal-400 rounded-xl border border-teal-700/50">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100 text-sm">
                        {fileData?.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Modalitas:{" "}
                        <span className="font-semibold text-teal-300">
                          {fileData?.modality}
                        </span>{" "}
                        • {fileData?.dimensions} ({fileData?.size})
                      </p>
                    </div>
                  </div>
                  <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-xs font-semibold px-3 py-1 rounded-xl">
                    Tervalidasi
                  </span>
                </div>

                {/* DISPLAY GAMBAR CT */}
                <div className="bg-[#030712] rounded-2xl h-112 flex flex-col items-center justify-center text-slate-400 space-y-2 relative overflow-hidden border border-slate-800 shadow-inner">
                  {originalPreviewUrl ? (
                    <>
                      {/* TOOLBAR ZOOM PAGE 2 */}
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 text-white text-xs shadow-lg">
                        <button
                          onClick={handleZoomOut}
                          className="px-2 py-1 hover:bg-slate-800 rounded transition font-bold cursor-pointer"
                          title="Zoom Out"
                        >
                          -
                        </button>
                        <span className="px-2 text-[11px] text-cyan-400 font-mono font-bold">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                          onClick={handleZoomIn}
                          className="px-2 py-1 hover:bg-slate-800 rounded transition font-bold cursor-pointer"
                          title="Zoom In"
                        >
                          +
                        </button>
                        {zoomLevel !== 1 && (
                          <button
                            onClick={handleResetZoom}
                            className="px-2 py-1 hover:bg-slate-800 text-amber-400 hover:text-white rounded transition text-[10px] cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                        <img
                          src={originalPreviewUrl}
                          alt="Preview CT Asli"
                          style={{ transform: `scale(${zoomLevel})` }}
                          className="max-h-full max-w-full object-contain rounded-lg transition-transform duration-200"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-center space-y-2 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-teal-400" />
                      <p className="text-slate-200 text-sm font-medium">Memuat citra DICOM...</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-slate-400">
                    Citra CT asli dalam skala Hounsfield Unit (HU).
                  </p>
                  <button
                    onClick={handleReset}
                    className="border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Ganti File
                  </button>
                </div>
              </div>

              {/* KOLOM KANAN: PILIHAN METODE */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-100 text-base">
                      {processingMode === "research"
                        ? "Pilih Metode Peningkatan (Fokus Pratinjau)"
                        : "Pilih Operasi Enhancement Bebas"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {processingMode === "research"
                        ? "Pada Mode 1, seluruh metode otomatis diproses. Klik kartu untuk memilih fokus tampilan awal."
                        : "Klik kartu untuk mengaktifkan atau menonaktifkan proses / kernel yang ingin diproses."}
                    </p>
                  </div>
                </div>

                {/* 5 KARTU METODE ASLI DENGAN INTERAKSI MODE 1 & MODE 2 */}
                <div className="space-y-2.5">
                  {methods.map((method) => {
                    const opKey = method.backendKey as "contrast" | "hpf_1" | "hpf_2" | "hpf_3" | "fusion";
                    const isResearchSelected = selectedResearchMethod === method.id;
                    const isExplorationActive = explorationOps[opKey];

                    const isActive =
                      processingMode === "research" ? isResearchSelected : isExplorationActive;

                    return (
                      <div
                        key={method.id}
                        onClick={() => {
                          if (processingMode === "research") {
                            setSelectedResearchMethod(method.id);
                          } else {
                            toggleExplorationOp(opKey);
                          }
                        }}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start justify-between shadow-md ${isActive
                          ? method.activeRing
                          : "bg-[#0E1526]/80 border-slate-800/90 hover:border-slate-700 hover:bg-[#131C33]/60 opacity-60"
                          }`}
                      >
                        <div className="space-y-1 flex-grow">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${method.dotColor}`} />
                            <h4 className="text-sm font-bold text-slate-100">
                              {method.title}
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${method.colorBadge}`}>
                              {method.id.toUpperCase()}
                            </span>
                            {processingMode === "exploration" && (
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                  isExplorationActive
                                    ? "bg-teal-950 text-teal-300 border border-teal-800/80"
                                    : "bg-slate-900 text-slate-500"
                                }`}
                              >
                                {isExplorationActive ? "AKTIF" : "NONAKTIF"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 pl-4">
                            {method.desc}
                          </p>

                          {/* Tampilan Nilai Matriks Kernel 3x3 */}
                          {method.matrix && (
                            <div className="pl-4 pt-1.5">
                              <button
                                type="button"
                                onClick={(e) => toggleShowMatrix(method.id, e)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 transition"
                              >
                                <Grid3x3 className="w-3 h-3" />
                                {showMatrixCard[method.id] ? "Sembunyikan Nilai Matriks" : "Lihat Nilai Matriks 3×3"}
                              </button>

                              {showMatrixCard[method.id] && (
                                <div
                                  className="mt-2 p-2.5 bg-[#050811] rounded-xl border border-slate-800/90 space-y-1.5 animate-in fade-in duration-150"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400 font-medium">
                                      {method.matrixNote}
                                    </span>
                                    <span className="font-mono text-cyan-300">
                                      Total Bobot (&Sigma;): {method.matrix.flat().reduce((a, b) => a + b, 0)}
                                    </span>
                                  </div>
                                  <div className="flex justify-start pt-0.5">
                                    <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800/80 font-mono text-center">
                                      {method.matrix.map((row, rIdx) =>
                                        row.map((val, cIdx) => (
                                          <div
                                            key={`${rIdx}-${cIdx}`}
                                            className={`w-7 h-6 flex items-center justify-center rounded text-xs ${
                                              rIdx === 1 && cIdx === 1
                                                ? "bg-cyan-950 text-cyan-300 font-bold border border-cyan-700/60"
                                                : "bg-slate-900 text-slate-300"
                                            }`}
                                          >
                                            {val}
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Indikator Checkbox / Radio */}
                        <div className="mt-0.5">
                          {isActive ? (
                            <div className="w-5 h-5 rounded-full bg-teal-500 text-slate-950 flex items-center justify-center text-xs shadow-sm font-bold">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-slate-700 bg-slate-800"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* KONTROL FUSI CITRA (MUNCUL JIKA FUSI DIPILIH ATAU DIAKTIFKAN) */}
                  {((processingMode === "research" && selectedResearchMethod === "fusi") ||
                    (processingMode === "exploration" && explorationOps.fusion)) && (
                      <div className="bg-gradient-to-br from-teal-950/40 to-cyan-950/30 border border-teal-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200 shadow-md">
                        <div>
                          <h4 className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-teal-400" />
                            Pilih Pasangan Kernel Fusi
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {processingMode === "research"
                              ? "Pada Mode Penelitian baku, Kernel 1 adalah standar modul PDF."
                              : "Pilih kernel penajaman yang dileburkan kembali dengan citra CT asli."}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {[
                            { id: "hpf1", label: "Kernel 1 (Baku)" },
                            { id: "hpf2", label: "Kernel 2" },
                            { id: "hpf3", label: "Kernel 3" },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setFusionTarget(item.id)}
                              className={`p-2.5 rounded-xl border font-bold transition cursor-pointer ${fusionTarget === item.id
                                ? "bg-teal-600 text-white border-teal-500 shadow-sm"
                                : "bg-slate-900 text-slate-300 border-slate-700 hover:border-teal-500/50"
                                }`}
                            >
                              {item.label}
                            </button>
                          ))}
                          {processingMode === "exploration" && useCustomKernel && (
                            <button
                              type="button"
                              onClick={() => setFusionTarget("custom")}
                              className={`p-2.5 rounded-xl border font-bold transition cursor-pointer ${fusionTarget === "custom"
                                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                                : "bg-slate-900 text-slate-300 border-slate-700 hover:border-indigo-500/50"
                                }`}
                            >
                              Kernel Kustom
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  {/* KONTROL WINDOWING & FITUR TAMBAHAN DI MODE EKSPLORASI */}
                  {processingMode === "exploration" ? (
                    <div className="space-y-3">
                      {/* KUSTOMISASI WINDOWING */}
                      <div className="bg-[#0E1526]/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                            Kustomisasi Windowing (WW & WL)
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Batas Tulang Mastoid
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="text-slate-400 font-medium block mb-1">
                              Window Width (WW)
                            </label>
                            <input
                              type="number"
                              value={customWW}
                              onChange={(e) => setCustomWW(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-teal-400 transition"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 font-medium block mb-1">
                              Window Level (WL)
                            </label>
                            <input
                              type="number"
                              value={customWL}
                              onChange={(e) => setCustomWL(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-teal-400 transition"
                            />
                          </div>
                        </div>

                        {/* PRESET CEPAT */}
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                          <span className="text-slate-500 font-medium self-center mr-1">
                            Preset:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomWW(2000);
                              setCustomWL(400);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-teal-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer transition"
                          >
                            Mastoid (2000 / 400)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomWW(3000);
                              setCustomWL(500);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer transition"
                          >
                            Temporal Tinggi (3000 / 500)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomWW(350);
                              setCustomWL(40);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer transition"
                          >
                            Jaringan Lunak (350 / 40)
                          </button>
                        </div>
                      </div>

                      {/* FITUR TAMBAHAN: MATRIKS FILTER KUSTOM (3×3) */}
                      <div className="bg-[#0E1526]/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Grid3x3 className="w-3.5 h-3.5 text-indigo-400" />
                            Kernel Filter Kustom (3×3)
                          </span>
                          {/* Toggle aktifkan kernel kustom */}
                          <button
                            type="button"
                            onClick={() => setUseCustomKernel(!useCustomKernel)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition flex items-center gap-1.5 ${
                              useCustomKernel
                                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/30"
                                : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600"
                            }`}
                          >
                            {useCustomKernel ? (
                              <><CheckSquare className="w-3 h-3" /> Aktif — Kirim ke Backend</>
                            ) : (
                              <><Square className="w-3 h-3" /> Nonaktif</>
                            )}
                          </button>
                        </div>

                        {useCustomKernel && (
                          <p className="text-[10px] text-indigo-300 bg-indigo-950/50 border border-indigo-700/40 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                            <HelpCircle className="w-3 h-3 shrink-0" />
                            Kernel kustom akan diproses sebagai HPF tambahan. Tersedia di hasil sebagai "Filter Kustom".
                          </p>
                        )}

                        {/* Tombol buka / tutup editor matriks */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            {useCustomKernel ? "Edit nilai matriks di bawah:" : "Aktifkan untuk mengirim kernel ini ke server."}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowCustomMatrix(!showCustomMatrix)}
                            className="text-[10px] text-indigo-300 hover:text-indigo-200 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700/50 cursor-pointer transition"
                          >
                            {showCustomMatrix ? "Sembunyikan" : "Buka Editor"}
                          </button>
                        </div>

                        {showCustomMatrix && (
                          <div className="space-y-2.5 pt-1 border-t border-slate-800 animate-in fade-in duration-150">
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {[
                                { id: "kernel_1", label: "Kernel 1 (8-Arah)" },
                                { id: "kernel_2", label: "Kernel 2 (4-Arah)" },
                                { id: "kernel_3", label: "Kernel 3 (Diagonal)" },
                                { id: "high_boost", label: "High-Boost" },
                              ].map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => applyMatrixPreset(p.id)}
                                  className={`px-2 py-0.5 rounded border cursor-pointer transition ${matrixPreset === p.id
                                    ? "bg-indigo-600 text-white border-indigo-400 font-bold"
                                    : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600"
                                    }`}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>

                            <div className="flex justify-center p-2 bg-[#030712] rounded-xl border border-slate-800">
                              <div className="grid grid-cols-3 gap-1.5">
                                {customMatrix.map((row, rIdx) =>
                                  row.map((val, cIdx) => (
                                    <input
                                      key={`${rIdx}-${cIdx}`}
                                      type="number"
                                      value={val}
                                      onChange={(e) =>
                                        updateMatrixCell(rIdx, cIdx, e.target.value)
                                      }
                                      className={`w-11 h-9 text-center font-mono text-xs rounded-lg border focus:outline-none transition ${rIdx === 1 && cIdx === 1
                                        ? "bg-indigo-950/80 border-indigo-500 text-indigo-300 font-bold"
                                        : "bg-slate-900 border-slate-700 text-slate-200"
                                        }`}
                                    />
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
                              <span>Total Bobot: <strong className="text-indigo-300">{customMatrixSum}</strong></span>
                              <span>Karakteristik: <strong className="text-cyan-300">{customMatrixSum === 0 ? "Zero-Sum HPF" : customMatrixSum === 1 ? "High-Boost" : "Kustom"}</strong></span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* PARAMETER CONTRAST KUSTOM */}
                      <div className="bg-[#0E1526]/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-amber-400" />
                            Parameter Kontras (imadjust)
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Rentang Normalisasi
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="text-slate-400 font-medium block mb-1">
                              Batas Bawah (Min)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={0.49}
                              step={0.05}
                              value={contrastMin}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v) && v >= 0 && v < contrastMax) setContrastMin(v);
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-200 font-mono text-xs focus:outline-none focus:border-amber-400 transition"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 font-medium block mb-1">
                              Batas Atas (Max)
                            </label>
                            <input
                              type="number"
                              min={0.51}
                              max={1.0}
                              step={0.05}
                              value={contrastMax}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                if (!isNaN(v) && v > contrastMin && v <= 1.0) setContrastMax(v);
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-amber-200 font-mono text-xs focus:outline-none focus:border-amber-400 transition"
                            />
                          </div>
                        </div>

                        {/* Preset cepat kontras */}
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                          <span className="text-slate-500 font-medium self-center mr-1">
                            Preset:
                          </span>
                          <button
                            type="button"
                            onClick={() => { setContrastMin(0.2); setContrastMax(0.9); }}
                            className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer transition"
                          >
                            Baku PDF (0.2 / 0.9)
                          </button>
                          <button
                            type="button"
                            onClick={() => { setContrastMin(0.1); setContrastMax(0.95); }}
                            className="bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer transition"
                          >
                            Lebar (0.1 / 0.95)
                          </button>
                          <button
                            type="button"
                            onClick={() => { setContrastMin(0.3); setContrastMax(0.8); }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer transition"
                          >
                            Sempit (0.3 / 0.8)
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-500">
                          Rentang normalisasi intensitas piksel sebelum HPF. Semakin sempit = kontras lebih tinggi.
                          Nilai baku sesuai modul: Min 0.2, Max 0.9.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* PARAMETER BAKU MODE PENELITIAN */
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                      <p className="text-xs font-semibold text-slate-300">
                        Parameter Baku: WW {fileData?.windowWidth || 2000} • WL {fileData?.windowLevel || 400}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Rentang optimal visualisasi struktur pneumatic cell tulang mastoid sesuai modul penelitian (PDF). Seluruh proses (Kontras, HPF 1-3, Fusi) dijalankan otomatis.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* EKSEKUSI BUTTON & PROGRESS */}
              <div className="lg:col-span-12 pt-4 border-t border-slate-800/80 space-y-4">
                {processStatus === "processing" ? (
                  <div className="bg-teal-950/30 p-4 rounded-2xl border border-teal-500/40 space-y-2 shadow-sm">
                    <div className="flex justify-between text-xs font-bold text-teal-300">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                        Sedang Menerapkan Algoritma Pemrosesan Citra ({processingMode === "research" ? "Mode 1: Penelitian" : "Mode 2: Eksplorasi"})...
                      </span>
                      <span className="font-mono">{processProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="bg-gradient-to-r from-teal-400 to-cyan-400 h-full rounded-full transition-all duration-200"
                        style={{ width: `${processProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {processingMode === "research"
                        ? "Pemrosesan otomatis seluruh 6 output modul penelitian baku (PDF)."
                        : `Pemrosesan sesuai konfigurasi operasi pilihan Anda (WW: ${customWW}, WL: ${customWL}).`}
                    </p>
                    <button
                      onClick={() => handleProcessImage()}
                      className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white text-sm font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-teal-500/25 flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      Proses Citra Sekarang
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3: HASIL PEMROSESAN (DILENGKAPI ZOOM IN / ZOOM OUT) */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-teal-300 via-emerald-200 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                  Hasil Pemrosesan Citra CT
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Bandingkan citra asli dengan citra hasil filter secara langsung menggunakan fitur perbesaran interaktif.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full border bg-slate-900 border-slate-700 text-teal-300">
                  {processingMode === "research" ? "Mode 1: Penelitian" : "Mode 2: Eksplorasi"}
                </span>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  Ubah Parameter
                </button>
              </div>
            </div>

            {/* BANNER HASIL DENGAN CHIPS */}
            <div className="bg-[#0E1526]/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">
                    Citra Selesai Direkonstruksi
                  </h4>
                  <p className="text-xs text-slate-400">
                    {fileData?.name} • Dimensi {fileData?.dimensions}
                  </p>
                </div>
              </div>

              {/* Selector Hasil yang Sedang Aktif */}
              {resultsData && (
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
                  {Object.keys(resultsData).map((key) => {
                    const labelMap: Record<string, string> = {
                      original: "Original",
                      contrast: "Kontras",
                      hpf_1: "HPF 1",
                      hpf_2: "HPF 2",
                      hpf_3: "HPF 3",
                      fusion: "Fusi",
                      custom_hpf: "Filter Kustom",
                    };
                    const label =
                      labelMap[key] ||
                      (key.startsWith("fusion_")
                        ? key.replace("fusion_", "Fusi ")
                        : key);
                    const isActive = activeResultKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveResultKey(key)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${isActive
                          ? "bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-500/25"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                          }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* TOOLBAR ZOOM GLOBAL PAGE 3 */}
            <div className="flex justify-between items-center bg-[#0C1220] text-white px-4 py-2.5 rounded-2xl shadow-lg border border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Maximize2 className="w-4 h-4 text-cyan-400" />
                <span>Kontrol Zoom Perbandingan Citra:</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleZoomOutP3}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-700 cursor-pointer"
                  title="Perkecil"
                >
                  <ZoomOut className="w-3.5 h-3.5" /> -
                </button>
                <span className="px-2 text-xs text-cyan-400 font-mono font-bold">
                  {Math.round(zoomLevelP3 * 100)}%
                </span>
                <button
                  onClick={handleZoomInP3}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-700 cursor-pointer"
                  title="Perbesar"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> +
                </button>
                {zoomLevelP3 !== 1 && (
                  <button
                    onClick={handleResetZoomP3}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ml-1 border border-slate-700 cursor-pointer"
                  >
                    Reset Zoom
                  </button>
                )}
              </div>
            </div>

            {/* PERBANDINGAN CITRA KIRI VS KANAN DENGAN ZOOM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CITRA ASLI */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                    Citra Asli (Bone Windowing)
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    WW: {processingMode === "research" ? "2000" : customWW} / WL:{" "}
                    {processingMode === "research" ? "400" : customWL}
                  </span>
                </div>

                <div className="bg-[#030712] rounded-3xl h-96 flex flex-col items-center justify-center text-slate-400 space-y-2 overflow-hidden relative border border-slate-800 shadow-inner">
                  {originalPreviewUrl ? (
                    <div className="w-full h-full flex items-center justify-center overflow-auto p-3">
                      <img
                        src={originalPreviewUrl}
                        alt="CT Asli Windowed"
                        style={{ transform: `scale(${zoomLevelP3})` }}
                        className="max-h-full max-w-full object-contain rounded-xl transition-transform duration-200"
                      />
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm font-medium">Citra asli tidak tersedia</p>
                  )}
                </div>
              </div>

              {/* CITRA HASIL PEMROSESAN */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    Hasil:{" "}
                    <span className="text-teal-300 capitalize font-extrabold">
                      {activeResultKey.replace("_", " ")}
                    </span>
                  </h3>
                  <span className="text-[11px] text-teal-300 bg-teal-950/80 border border-teal-500/30 px-2.5 py-0.5 rounded-md font-bold font-mono">
                    Output 8-bit Teroptimasi
                  </span>
                </div>

                <div className="bg-[#030712] rounded-3xl h-96 flex flex-col items-center justify-center text-slate-400 space-y-2 overflow-hidden relative border border-slate-800 shadow-inner">
                  {activeResultPreviewUrl ? (
                    <div className="w-full h-full flex items-center justify-center overflow-auto p-3">
                      <img
                        src={activeResultPreviewUrl}
                        alt="CT Hasil Pemrosesan"
                        style={{ transform: `scale(${zoomLevelP3})` }}
                        className="max-h-full max-w-full object-contain rounded-xl transition-transform duration-200"
                      />
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm font-medium">
                      Citra hasil belum tersedia
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* AKSI DOWNLOAD & KEMBALI */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-5">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Proses Berkas Lain
                </button>
                <p className="text-xs text-slate-400 hidden lg:block">
                  Kedua citra dapat diunduh untuk dokumentasi atau pelaporan HKI.
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => handleDownload("png")}
                  className="w-full sm:w-auto border border-cyan-500/50 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 font-bold px-5 py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  Unduh PNG
                </button>
                <button
                  onClick={() => handleDownload("dicom")}
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-teal-500/25 text-xs flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  Unduh DICOM (.dcm)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 border-t border-slate-800/80 pt-5 mt-8 gap-2">
        <p className="font-medium">
          MastoidLab · Platform Pemrosesan Citra Tulang Mastoid
        </p>
        <p>
          Ditujukan untuk keperluan riset, edukasi, dan visualisasi citra medis radiografi.
        </p>
      </footer>
    </div>
  );
}
