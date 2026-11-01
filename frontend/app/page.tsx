"use client";

import React, { useState, useRef } from "react";
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
  // Ambil URL Backend dari environment variable (.env)
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

  // Mode Pemrosesan: Research (baku) vs Exploration (kustom)
  const [processingMode, setProcessingMode] = useState<"research" | "exploration">(
    "research"
  );
  const [customWW, setCustomWW] = useState<number>(2000);
  const [customWL, setCustomWL] = useState<number>(400);

  // State Hasil Backend
  const [resultsData, setResultsData] = useState<Record<string, ProcessResultItem> | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("kontras");
  const [fusionTarget, setFusionTarget] = useState<string>("hpf1");
  const [activeResultKey, setActiveResultKey] = useState<string>("contrast");

  // State Preview & Zoom
  const [zoomLevel, setZoomLevel] = useState<number>(1);
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

  // Daftar Metode Pemrosesan
  const methods = [
    {
      id: "kontras",
      backendKey: "contrast",
      title: "Peningkatan kontras",
      desc: "Perjelas perbedaan intensitas pada citra.",
    },
    {
      id: "hp1",
      backendKey: "hpf_1",
      title: "High-Pass Filter · Kernel 1",
      desc: "Tonjolkan detail tepi dengan kernel 1.",
    },
    {
      id: "hp2",
      backendKey: "hpf_2",
      title: "High-Pass Filter · Kernel 2",
      desc: "Pertajam detail citra dengan kernel 2.",
    },
    {
      id: "hp3",
      backendKey: "hpf_3",
      title: "High-Pass Filter · Kernel 3",
      desc: "Gunakan alternatif penajaman dengan kernel 3.",
    },
    {
      id: "fusi",
      backendKey: "fusion",
      title: "Fusi Citra",
      desc: "Gabungkan citra asli dengan hasil pemfilteran.",
    },
  ];

  // Helper mendapatkan URL preview citra asli
  const originalPreviewUrl = resultsData?.original?.preview_url || null;

  // Helper mendapatkan URL preview citra hasil
  const activeResultPreviewUrl =
    (resultsData && resultsData[activeResultKey]?.preview_url) ||
    resultsData?.fusion?.preview_url ||
    resultsData?.contrast?.preview_url ||
    null;

  // HANDLE ZOOM
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  // 1. FUNGSI UNGGAH DAN PROSES AWAL DARI BACKEND
  const processUploadFile = (file: File) => {
    if (!file) return;

    setUploadError("");
    setUploadProgress(0);

    const fileNameLower = file.name.toLowerCase();
    if (!fileNameLower.endsWith(".dcm") && !fileNameLower.endsWith(".dicom")) {
      setUploadStatus("error");
      setUploadError(
        "Format file tidak didukung. Harap unggah file .dcm atau .dicom (DICOM)"
      );
      return;
    }

    setRawFile(file);
    setUploadStatus("uploading");

    // Menggunakan XMLHttpRequest untuk melacak progress upload secara akurat
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
        setUploadStatus("error");
        setUploadError("Gagal membaca respons dari server pemrosesan.");
      }
    };

    xhr.onerror = () => {
      setUploadStatus("error");
      setUploadError(
        `Tidak dapat terhubung ke server backend di ${API_BASE_URL}. Pastikan backend sudah aktif.`
      );
    };

    xhr.open("POST", `${API_BASE_URL}/upload`);
    xhr.send(formData);
  };

  // 2. FUNGSI EKSEKUSI PEMROSESAN DI STEP 2
  const handleProcessImage = (simulateError = false) => {
    setProcessStatus("processing");
    setProcessProgress(0);
    setProcessError("");

    if (simulateError) {
      setTimeout(() => {
        setProcessStatus("error");
        setProcessProgress(0);
        setProcessError(
          "Gagal memproses citra: Terjadi simulasi kesalahan internal pada server (DICOM Corrupted)."
        );
      }, 500);
      return;
    }

    // Jika mode adalah Exploration dan ada kustomisasi parameter, kirim request baru ke backend
    if (processingMode === "exploration" && rawFile) {
      let progress = 10;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 20, 90);
        setProcessProgress(progress);
      }, 150);

      const formData = new FormData();
      formData.append("file", rawFile);
      formData.append("mode", "exploration");
      formData.append("window_width", customWW.toString());
      formData.append("window_level", customWL.toString());

      // Tentukan operasi yang diminta
      const operations: string[] = ["windowing", "contrast", "hpf_1", "hpf_2", "hpf_3", "fusion"];
      formData.append("operations", JSON.stringify(operations));

      // Tentukan kernel fusi yang dipilih
      let fusionKernels = ["hpf_1"];
      if (fusionTarget === "hpf2") fusionKernels = ["hpf_2"];
      if (fusionTarget === "hpf3") fusionKernels = ["hpf_3"];
      formData.append("fusion_kernels", JSON.stringify(fusionKernels));

      fetch(`${API_BASE_URL}/upload`, {
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

            // Set active key sesuai pilihan
            if (selectedMethod === "kontras") setActiveResultKey("contrast");
            else if (selectedMethod === "hp1") setActiveResultKey("hpf_1");
            else if (selectedMethod === "hp2") setActiveResultKey("hpf_2");
            else if (selectedMethod === "hp3") setActiveResultKey("hpf_3");
            else if (selectedMethod === "fusi") {
              const fusionKey = Object.keys(data.results).find((k) =>
                k.startsWith("fusion")
              ) || "fusion";
              setActiveResultKey(fusionKey);
            }

            setTimeout(() => setCurrentStep(3), 400);
          } else {
            setProcessStatus("error");
            setProcessError(data.message || "Gagal menjalankan pemrosesan citra.");
          }
        })
        .catch((err) => {
          clearInterval(progressInterval);
          setProcessStatus("error");
          setProcessError(
            `Gagal terhubung ke backend: ${err.message || "Network Error"}`
          );
        });
    } else {
      // Pada mode research, backend sudah menghasilkan seluruh 6 tahap saat upload awal!
      // Cukup petakan activeResultKey sesuai metode yang dipilih pengguna
      let targetKey = "contrast";
      if (selectedMethod === "kontras") targetKey = "contrast";
      else if (selectedMethod === "hp1") targetKey = "hpf_1";
      else if (selectedMethod === "hp2") targetKey = "hpf_2";
      else if (selectedMethod === "hp3") targetKey = "hpf_3";
      else if (selectedMethod === "fusi") targetKey = "fusion";

      setActiveResultKey(targetKey);

      let progress = 0;
      const interval = setInterval(() => {
        progress += 30;
        if (progress >= 100) {
          clearInterval(interval);
          setProcessProgress(100);
          setProcessStatus("success");
          setTimeout(() => setCurrentStep(3), 400);
        } else {
          setProcessProgress(progress);
        }
      }, 100);
    }
  };

  // HANDLER PILIH FILE
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadFile(file);
    }
  };

  // HANDLER DRAG & DROP
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processUploadFile(files[0]);
    }
  };

  // RESET TOTAL STATE UNTUK FILE BARU
  const handleReset = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
  };

  // HANDLER DOWNLOAD
  const handleDownload = (format: "png" | "dicom") => {
    if (!resultsData) return;
    const currentItem =
      resultsData[activeResultKey] ||
      resultsData["fusion"] ||
      resultsData["contrast"];
    if (!currentItem) return;

    const downloadUrl =
      format === "png"
        ? currentItem.download_png_url
        : currentItem.download_dicom_url;

    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white px-6 md:px-12 py-6 text-[#1E293B]">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".dcm,.dicom"
        className="hidden"
      />

      <header>
        <div className="flex justify-between items-start border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-wider text-[#467975] font-mono">
              MASTOIDLAB
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              Peningkatan Citra CT Mastoid
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span className="text-xs text-slate-400 font-medium">
              Alat Penelitian & HKI
            </span>

            {currentStep === 2 && (
              <span className="bg-[#E6F7F5] text-[#0D7A75] text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                File berhasil diunggah
              </span>
            )}
            {currentStep === 3 && (
              <span className="bg-[#E6F7F5] text-[#0D7A75] text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Pemrosesan selesai
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center py-4 text-xs font-medium border-b border-slate-100 mb-8">
          <div className="text-[#0D7A75] font-semibold">
            0{currentStep} / 03
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span
              onClick={handleReset}
              className={`cursor-pointer hover:text-[#0D7A75] transition ${currentStep === 1 ? "text-slate-800 font-bold" : ""
                }`}
            >
              Unggah Citra
            </span>
            <span>/</span>
            <span
              onClick={() => fileData && setCurrentStep(2)}
              className={`transition ${fileData
                ? "cursor-pointer hover:text-[#0D7A75]"
                : "opacity-40 cursor-not-allowed"
                } ${currentStep === 2 ? "text-slate-800 font-bold" : ""}`}
            >
              Pilih metode
            </span>
            <span>/</span>
            <span
              onClick={() => processStatus === "success" && setCurrentStep(3)}
              className={`transition ${processStatus === "success"
                ? "cursor-pointer hover:text-[#0D7A75]"
                : "opacity-40 cursor-not-allowed"
                } ${currentStep === 3 ? "text-slate-800 font-bold" : ""}`}
            >
              Tinjau Hasil
            </span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* PAGE 1: UPLOAD CITRA */}
      {/* ========================================================================= */}
      <main className="flex-grow">
        {currentStep === 1 && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-[#467975] tracking-tight">
                Perjelas citra CT Anda
              </h2>
              <p className="text-slate-400 text-sm max-w-xl mx-auto">
                Unggah citra CT Mastoid format DICOM (.dcm), pilih metode pemrosesan, lalu
                bandingkan hasilnya dalam satu alur terpadu.
              </p>
            </div>

            {/* DROPZONE AREA */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center space-y-4 transition-all duration-200 ${isDragging
                ? "bg-[#D1F2ED] border-[#0D7A75] scale-[1.01]"
                : "bg-[#EAF8F6] border-[#0D7A75]/40"
                }`}
            >
              <div className="w-12 h-12 bg-[#D1F2ED] rounded-full flex items-center justify-center mx-auto text-[#0D7A75]">
                <Upload className="w-5 h-5" />
              </div>

              {(uploadStatus === "idle" || uploadStatus === "success") && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-800">
                      Letakkan file CT Anda di sini
                    </h3>
                    <p className="text-xs text-slate-400">
                      Seret file ke area ini atau pilih file dari perangkat Anda.
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-[#0D7A75] hover:bg-[#0B6863] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-all shadow-sm"
                    >
                      Pilih File
                    </button>
                  </div>
                </div>
              )}

              {uploadStatus === "uploading" && (
                <div className="max-w-xs mx-auto space-y-3 py-2">
                  <div className="flex justify-between text-xs font-semibold text-[#0D7A75]">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mengunggah & memverifikasi...
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#0D7A75] h-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Memvalidasi modalitas CT dan mengekstrak metadata DICOM...
                  </p>
                </div>
              )}

              {uploadStatus === "error" && (
                <div className="max-w-md mx-auto space-y-3 py-2 bg-red-50 p-4 rounded-xl border border-red-200">
                  <div className="flex items-center justify-center gap-2 text-red-600 font-semibold text-sm">
                    <AlertCircle className="w-5 h-5" />
                    <span>Gagal mengunggah file.</span>
                  </div>
                  <p className="text-xs text-red-500">{uploadError}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition"
                  >
                    Coba pilih file lain
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-400 pt-2">
                Format yang didukung: DICOM (.dcm, .dicom) • Modalitas CT Scan
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="bg-[#F8FAFC] p-5 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-[#0D7A75]">01</span>
                <h4 className="font-semibold text-sm text-slate-800">Unggah Citra</h4>
                <p className="text-xs text-slate-400">
                  Pilih satu file CT tulang mastoid dalam format DICOM.
                </p>
              </div>
              <div className="bg-[#F8FAFC] p-5 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-[#0D7A75]">02</span>
                <h4 className="font-semibold text-sm text-slate-800">Pilih metode</h4>
                <p className="text-xs text-slate-400">
                  Sesuaikan pemrosesan: Kontras, HPF multi-kernel, atau Fusi citra.
                </p>
              </div>
              <div className="bg-[#F8FAFC] p-5 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-[#0D7A75]">03</span>
                <h4 className="font-semibold text-sm text-slate-800">Tinjau dan ekspor</h4>
                <p className="text-xs text-slate-400">
                  Bandingkan citra asli dan hasil, lalu unduh PNG & DICOM sekunder.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 2: PILIH METODE */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold text-[#467975] tracking-tight">
                  Atur pemrosesan citra
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Tinjau file yang diunggah dan pilih metode untuk meningkatkan visualisasi citra CT.
                </p>
              </div>

              {/* Mode Pemrosesan Switcher */}
              <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto border border-slate-200">
                <button
                  type="button"
                  onClick={() => setProcessingMode("research")}
                  className={`px-3 py-1.5 rounded-lg transition ${processingMode === "research"
                    ? "bg-white text-[#0D7A75] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Mode Penelitian (Baku)
                </button>
                <button
                  type="button"
                  onClick={() => setProcessingMode("exploration")}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${processingMode === "exploration"
                    ? "bg-white text-[#0D7A75] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Mode Eksplorasi
                </button>
              </div>
            </div>

            {/* ERROR BANNER */}
            {processStatus === "error" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800">
                      Gagal diproses
                    </h4>
                    <p className="text-xs text-red-600 mt-0.5">{processError}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleProcessImage(false)}
                  className="flex items-center gap-1.5 text-xs bg-red-600 text-white px-3 py-1.5 hover:bg-red-700 transition rounded-lg"
                >
                  <RefreshCcw className="w-3.5 h-3.5" />
                  Coba Lagi
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* KOLOM KIRI: FILE PREVIEW */}
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#E6F7F5] text-[#467975] rounded-xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#467975] text-base">
                        {fileData?.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Modalitas: {fileData?.modality} • {fileData?.dimensions} ({fileData?.size})
                      </p>
                    </div>
                  </div>
                  <span className="bg-[#E6F7F5] text-[#0D7A75] text-xs font-medium px-4 py-2 rounded-xl">
                    File tervalidasi
                  </span>
                </div>

                {/* DISPLAY GAMBAR CT */}
                <div className="bg-[#0B0F17] rounded-xl h-112 flex flex-col items-center justify-center text-slate-400 space-y-2 relative overflow-hidden group">
                  {originalPreviewUrl ? (
                    <>
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-700/50 text-white text-xs">
                        <button
                          onClick={handleZoomOut}
                          className="px-2 py-1 hover:bg-slate-700 rounded transition"
                          title="Zoom Out"
                        >
                          -
                        </button>
                        <span className="px-1 text-[11px] text-slate-300 font-mono">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                          onClick={handleZoomIn}
                          className="px-2 py-1 hover:bg-slate-700 rounded transition"
                          title="Zoom In"
                        >
                          +
                        </button>
                        {zoomLevel !== 1 && (
                          <button
                            onClick={handleResetZoom}
                            className="px-2 py-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition text-[10px]"
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
                      <div className="text-slate-500 tracking-widest text-lg font-mono">
                        [ ]
                      </div>
                      <p className="text-white text-sm font-medium">
                        Pratinjau citra asli
                      </p>
                      <p className="text-xs text-slate-500">
                        Memuat citra DICOM dari backend...
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-400">
                    Citra CT asli berhasil diubah ke skala Hounsfield Unit (HU).
                  </p>
                  <button
                    onClick={handleReset}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg transition"
                  >
                    Ganti file
                  </button>
                </div>
              </div>

              {/* KOLOM KANAN: OPSI METODE */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-800 text-base">
                    Pilih metode pemrosesan
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pilih metode utama yang ingin Anda tinjau dan bandingkan.
                  </p>
                </div>

                <div className="space-y-2">
                  {methods.map((method) => {
                    const isSelected = selectedMethod === method.id;
                    return (
                      <div
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between ${isSelected
                          ? "bg-[#EAF8F6] border-[#0D7A75]"
                          : "bg-white border-slate-200 hover:border-slate-300"
                          }`}
                      >
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">
                            {method.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {method.desc}
                          </p>
                        </div>
                        <div className="mt-0.5">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-[#0D7A75] text-white flex items-center justify-center text-xs">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-slate-300 bg-slate-100"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* KONTROL KHUSUS FUSI */}
                  {selectedMethod === "fusi" && (
                    <div className="bg-[#EAF8F6] border border-[#0D7A75]/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                      <div>
                        <h4 className="text-xs font-semibold text-[#0D7A75]">
                          Pilih Pasangan Fusi (Citra Asli + Filter)
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Pilih kernel penajaman yang dileburkan dengan citra CT asli.
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
                            className={`p-2.5 rounded-lg border text-center transition font-medium ${fusionTarget === item.id
                              ? "bg-[#0D7A75] text-white border-[#0D7A75]"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                              }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* KONTROL WINDOWING EKSPLORASI */}
                  {processingMode === "exploration" ? (
                    <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-[#0D7A75]" />
                          Kustomisasi Windowing
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Batas Tulang Mastoid
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-slate-500 block mb-1">
                            Window Width (WW)
                          </label>
                          <input
                            type="number"
                            value={customWW}
                            onChange={(e) => setCustomWW(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#0D7A75]"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block mb-1">
                            Window Level (WL)
                          </label>
                          <input
                            type="number"
                            value={customWL}
                            onChange={(e) => setCustomWL(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#0D7A75]"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 space-y-1">
                      <p className="text-xs font-medium text-slate-700">
                        Window Width: {fileData?.windowWidth} • Window Level:{" "}
                        {fileData?.windowLevel}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Parameter standar modul penelitian mastoid. Citra siap diproses.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* AKSI DAN PROGRESS BAR */}
              <div className="lg:col-span-12 pt-4 border-t border-slate-100 space-y-4">
                {processStatus === "processing" ? (
                  <div className="bg-[#EAF8F6] p-4 rounded-xl border border-[#0D7A75]/30 space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-[#0D7A75]">
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Memproses citra CT...
                      </span>
                      <span>{processProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0D7A75] h-full transition-all duration-200"
                        style={{ width: `${processProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      Diproses secara lokal menggunakan layanan backend Flask.
                    </p>
                    <div className="flex items-center gap-2">

                      <button
                        onClick={() => handleProcessImage(false)}
                        className="bg-[#0D7A75] hover:bg-[#0B6863] text-white text-sm font-medium px-8 py-2.5 rounded-lg transition-all shadow-sm flex items-center gap-2"
                      >
                        Proses citra
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PAGE 3: HASIL PEMROSESAN */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-3xl font-extrabold text-[#0D7A75] tracking-tight">
                Hasil pemrosesan citra
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Bandingkan citra asli dengan hasil pemrosesan sebelum menyimpan hasilnya.
              </p>
            </div>

            {/* BANNER SUCCESS */}
            <div className="bg-[#EAF8F6] border border-[#0D7A75]/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h4 className="text-sm font-semibold text-[#0D7A75] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Citra berhasil diproses
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  File: {fileData?.name} • Dimensi: {fileData?.dimensions}
                </p>
              </div>

              {/* Selector Hasil yang sedang aktif */}
              {resultsData && (
                <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  {Object.keys(resultsData).map((key) => {
                    const labelMap: Record<string, string> = {
                      original: "Original",
                      contrast: "Kontras",
                      hpf_1: "HPF 1",
                      hpf_2: "HPF 2",
                      hpf_3: "HPF 3",
                      fusion: "Fusi",
                    };
                    const label = labelMap[key] || key;
                    const isActive = activeResultKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveResultKey(key)}
                        className={`text-xs px-2.5 py-1 rounded transition font-medium ${isActive
                          ? "bg-[#0D7A75] text-white"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PERBANDINGAN CITRA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CITRA ASLI */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Citra Asli (Bone Windowing)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    WW: {fileData?.windowWidth} / WL: {fileData?.windowLevel}
                  </span>
                </div>
                <div className="bg-[#0B0F17] rounded-2xl h-88 flex flex-col items-center justify-center text-slate-400 space-y-2 overflow-hidden relative">
                  {originalPreviewUrl ? (
                    <img
                      src={originalPreviewUrl}
                      alt="CT Asli Windowed"
                      className="max-h-full max-w-full object-contain rounded-2xl"
                    />
                  ) : (
                    <p className="text-white text-sm font-medium">CT asli</p>
                  )}
                </div>
              </div>

              {/* HASIL PEMROSESAN */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Hasil:{" "}
                    <span className="text-[#0D7A75] capitalize">
                      {activeResultKey.replace("_", " ")}
                    </span>
                  </h3>
                  <span className="text-[11px] text-[#0D7A75] font-semibold">
                    Output 8-bit Teroptimasi
                  </span>
                </div>
                <div className="bg-[#0B0F17] rounded-2xl h-88 flex flex-col items-center justify-center text-slate-400 space-y-2 overflow-hidden relative">
                  {activeResultPreviewUrl ? (
                    <img
                      src={activeResultPreviewUrl}
                      alt="CT Hasil Pemrosesan"
                      className="max-h-full max-w-full object-contain rounded-2xl"
                    />
                  ) : (
                    <p className="text-white text-sm font-medium">
                      CT setelah pemrosesan
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* AKSI DOWNLOAD & ULANGI */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-5 py-2.5 rounded-lg transition"
                >
                  Proses file lain
                </button>
                <p className="text-xs text-slate-400 hidden lg:block">
                  Tinjau kedua citra sebagai referensi visual penelitian Anda.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleDownload("png")}
                  className="w-full sm:w-auto border border-[#0D7A75] text-[#0D7A75] hover:bg-[#EAF8F6] font-medium px-4 py-2.5 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Unduh PNG
                </button>
                <button
                  onClick={() => handleDownload("dicom")}
                  className="w-full sm:w-auto bg-[#0D7A75] hover:bg-[#0B6863] text-white font-medium px-6 py-2.5 rounded-lg transition-all shadow-sm text-xs flex items-center justify-center gap-1.5"
                >
                  <FileDown className="w-4 h-4" />
                  Unduh DICOM (.dcm)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 border-t border-slate-100 pt-5 mt-8 gap-2">
        <p>MastoidLab · Pemrosesan citra CT mastoid</p>
        <p>
          Untuk penelitian dan visualisasi citra medis, bukan untuk diagnosis klinis otomatis.
        </p>
      </footer>
    </div>
  );
}
