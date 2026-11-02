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
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2
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

  // Mode Pemrosesan
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

  // Metode Pemrosesan dengan Aksen Dark Theme Berwarna
  const methods = [
    {
      id: "kontras",
      backendKey: "contrast",
      title: "Peningkatan Kontras",
      desc: "Perjelas perbedaan densitas intensitas tulang mastoid.",
      colorBadge: "bg-amber-950/80 text-amber-300 border-amber-500/40",
      activeRing: "border-amber-500/80 bg-amber-950/20 shadow-amber-900/30",
      dotColor: "bg-amber-400",
    },
    {
      id: "hp1",
      backendKey: "hpf_1",
      title: "High-Pass Filter · Kernel 1",
      desc: "Tonjolkan detail tepi kanalis dan trabekula mastoid.",
      colorBadge: "bg-sky-950/80 text-sky-300 border-sky-500/40",
      activeRing: "border-sky-500/80 bg-sky-950/20 shadow-sky-900/30",
      dotColor: "bg-sky-400",
    },
    {
      id: "hp2",
      backendKey: "hpf_2",
      title: "High-Pass Filter · Kernel 2",
      desc: "Pertajam batas sklerotik dengan matriks kernel 2.",
      colorBadge: "bg-indigo-950/80 text-indigo-300 border-indigo-500/40",
      activeRing: "border-indigo-500/80 bg-indigo-950/20 shadow-indigo-900/30",
      dotColor: "bg-indigo-400",
    },
    {
      id: "hp3",
      backendKey: "hpf_3",
      title: "High-Pass Filter · Kernel 3",
      desc: "Penajaman frekuensi tinggi untuk detail mikro tulang.",
      colorBadge: "bg-purple-950/80 text-purple-300 border-purple-500/40",
      activeRing: "border-purple-500/80 bg-purple-950/20 shadow-purple-900/30",
      dotColor: "bg-purple-400",
    },
    {
      id: "fusi",
      backendKey: "fusion",
      title: "Fusi Citra",
      desc: "Rekonstruksi leburan citra asli dengan citra filter.",
      colorBadge: "bg-teal-950/80 text-teal-300 border-teal-500/40",
      activeRing: "border-teal-500/80 bg-teal-950/20 shadow-teal-900/30",
      dotColor: "bg-teal-400",
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

  // 1. FUNGSI UNGGAH FILE
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

  // 2. FUNGSI PEMROSESAN
  const handleProcessImage = (simulateError = false) => {
    setProcessStatus("processing");
    setProcessProgress(0);
    setProcessError("");

    if (simulateError) {
      setTimeout(() => {
        setProcessStatus("error");
        setProcessProgress(0);
        setProcessError(
          "Gagal memproses citra: Terjadi simulasi kesalahan internal pada server."
        );
      }, 500);
      return;
    }

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

      const operations: string[] = ["windowing", "contrast", "hpf_1", "hpf_2", "hpf_3", "fusion"];
      formData.append("operations", JSON.stringify(operations));

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
          setProcessError(`Gagal terhubung ke backend: ${err.message || "Network Error"}`);
        });
    } else {
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadFile(file);
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
  };

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
    <div className="min-h-screen flex flex-col justify-between bg-[#090D16] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-950/25 via-[#090D16] to-[#06080F] px-6 md:px-12 py-6 text-slate-100">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
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
                MASTOIDLAB
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Platform Peningkatan & Analisis Citra Radiografi CT Tulang Mastoid
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
              className={`transition px-2.5 py-1 rounded-lg ${fileData ? "cursor-pointer hover:text-slate-200" : "cursor-not-allowed opacity-40"
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
      {/* PAGE 1: UPLOAD CITRA */}
      {/* ========================================================================= */}
      <main className="flex-grow">
        {currentStep === 1 && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-teal-300 via-emerald-200 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                Tingkatkan Kualitas Citra CT Mastoid
              </h2>
              <p className="text-slate-400 text-sm max-w-xl mx-auto">
                Unggah berkas DICOM CT Scan (.dcm), terapkan algoritma peningkatan kontras & penajaman frekuensi tinggi, lalu bandingkan hasilnya secara interaktif.
              </p>
            </div>

            {/* DROPZONE AREA */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-12 text-center space-y-4 transition-all duration-300 shadow-xl ${isDragging
                ? "bg-teal-950/40 border-teal-400 scale-[1.01]"
                : "bg-[#0E1526]/80 border-slate-700/80 hover:border-teal-500/60 hover:bg-[#121B30]/80"
                }`}
            >
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-teal-500/25">
                <Upload className="w-7 h-7" />
              </div>

              {(uploadStatus === "idle" || uploadStatus === "success") && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-100 text-base">
                      Letakkan Berkas DICOM Mastoid di Sini
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tarik file langsung ke area ini atau pilih file dari komputer Anda.
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white text-sm font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-teal-500/25 active:scale-95"
                    >
                      Pilih Berkas DICOM
                    </button>
                  </div>
                </div>
              )}

              {uploadStatus === "uploading" && (
                <div className="max-w-xs mx-auto space-y-3 py-3">
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
                <div className="max-w-md mx-auto space-y-3 py-3 bg-rose-950/40 p-5 rounded-2xl border border-rose-500/40 shadow-sm">
                  <div className="flex items-center justify-center gap-2 text-rose-300 font-semibold text-sm">
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                    <span>Gagal mengunggah file.</span>
                  </div>
                  <p className="text-xs text-rose-300">{uploadError}</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Pilih File Lain
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-500 pt-2 font-mono">
                Format: .DCM / .DICOM • Modalitas: CT Scan Kepala / Tulang Mastoid
              </p>
            </div>

            {/* FITUR KARTU DARK MODE COLORFUL */}
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
        {/* PAGE 2: PILIH METODE */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold bg-gradient-to-r from-teal-300 via-emerald-200 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                  Atur Pemrosesan Citra
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Tinjau file DICOM tervalidasi dan pilih algoritma penajaman yang ingin diterapkan.
                </p>
              </div>

              {/* Mode Pemrosesan Switcher */}
              <div className="inline-flex bg-slate-900/90 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto border border-slate-800">
                <button
                  type="button"
                  onClick={() => setProcessingMode("research")}
                  className={`px-3 py-1.5 rounded-lg transition ${processingMode === "research"
                    ? "bg-teal-900/60 text-teal-200 border border-teal-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  Mode Penelitian (Baku)
                </button>
                <button
                  type="button"
                  onClick={() => setProcessingMode("exploration")}
                  className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${processingMode === "exploration"
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
                  onClick={() => handleProcessImage(false)}
                  className="flex items-center gap-1.5 text-xs bg-rose-600 text-white font-semibold px-3 py-1.5 hover:bg-rose-700 transition rounded-lg"
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
                        Modalitas: <span className="font-semibold text-teal-300">{fileData?.modality}</span> • {fileData?.dimensions} ({fileData?.size})
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
                          className="px-2 py-1 hover:bg-slate-800 rounded transition font-bold"
                          title="Zoom Out"
                        >
                          -
                        </button>
                        <span className="px-2 text-[11px] text-cyan-400 font-mono font-bold">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                          onClick={handleZoomIn}
                          className="px-2 py-1 hover:bg-slate-800 rounded transition font-bold"
                          title="Zoom In"
                        >
                          +
                        </button>
                        {zoomLevel !== 1 && (
                          <button
                            onClick={handleResetZoom}
                            className="px-2 py-1 hover:bg-slate-800 text-amber-400 hover:text-white rounded transition text-[10px]"
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
                    className="border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl transition"
                  >
                    Ganti File
                  </button>
                </div>
              </div>

              {/* KOLOM KANAN: PILIHAN METODE */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-100 text-base">
                    Pilih Metode Peningkatan
                  </h3>
                  <p className="text-xs text-slate-400">
                    Setiap metode dirancang untuk menonjolkan fitur anatomi tulang mastoid yang spesifik.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {methods.map((method) => {
                    const isSelected = selectedMethod === method.id;
                    return (
                      <div
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start justify-between shadow-md ${isSelected
                          ? method.activeRing
                          : "bg-[#0E1526]/80 border-slate-800/90 hover:border-slate-700 hover:bg-[#131C33]/60"
                          }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${method.dotColor}`} />
                            <h4 className="text-sm font-bold text-slate-100">
                              {method.title}
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${method.colorBadge}`}>
                              {method.id.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 pl-4">
                            {method.desc}
                          </p>
                        </div>
                        <div className="mt-0.5">
                          {isSelected ? (
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

                  {/* KONTROL FUSI CITRA */}
                  {selectedMethod === "fusi" && (
                    <div className="bg-gradient-to-br from-teal-950/40 to-cyan-950/30 border border-teal-500/40 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200 shadow-md">
                      <div>
                        <h4 className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-teal-400" />
                          Pilih Pasangan Kernel Fusi
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Pilih kernel penajaman yang dileburkan kembali dengan citra CT asli.
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
                            className={`p-2.5 rounded-xl border font-bold transition ${fusionTarget === item.id
                              ? "bg-teal-600 text-white border-teal-500 shadow-sm"
                              : "bg-slate-900 text-slate-300 border-slate-700 hover:border-teal-500/50"
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
                    <div className="bg-[#0E1526]/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                          Kustomisasi Windowing
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
                    </div>
                  ) : (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                      <p className="text-xs font-semibold text-slate-300">
                        Parameter Baku: WW {fileData?.windowWidth} • WL {fileData?.windowLevel}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Rentang optimal visualisasi struktur pneumatic cell tulang mastoid.
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
                        Sedang Menerapkan Algoritma Pemrosesan Citra...
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
                      Pemrosesan komputasi matriks citra dieksekusi melalui modul backend.
                    </p>
                    <button
                      onClick={() => handleProcessImage(false)}
                      className="bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white text-sm font-semibold px-8 py-3 rounded-xl transition-all shadow-lg shadow-teal-500/25 flex items-center gap-2 active:scale-95"
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
            <div>
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-teal-300 via-emerald-200 to-cyan-300 bg-clip-text text-transparent tracking-tight">
                Hasil Pemrosesan Citra CT
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Bandingkan citra asli dengan citra hasil filter secara langsung menggunakan fitur perbesaran interaktif.
              </p>
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
                    };
                    const label = labelMap[key] || key;
                    const isActive = activeResultKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveResultKey(key)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition font-bold ${isActive
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
                  className="bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-700"
                  title="Perkecil"
                >
                  <ZoomOut className="w-3.5 h-3.5" /> -
                </button>
                <span className="px-2 text-xs text-cyan-400 font-mono font-bold">
                  {Math.round(zoomLevelP3 * 100)}%
                </span>
                <button
                  onClick={handleZoomInP3}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-700"
                  title="Perbesar"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> +
                </button>
                {zoomLevelP3 !== 1 && (
                  <button
                    onClick={handleResetZoomP3}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ml-1 border border-slate-700"
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
                    WW: {fileData?.windowWidth} / WL: {fileData?.windowLevel}
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
                  className="border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
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
                  className="w-full sm:w-auto border border-cyan-500/50 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 font-bold px-5 py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  Unduh PNG
                </button>
                <button
                  onClick={() => handleDownload("dicom")}
                  className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-teal-500/25 text-xs flex items-center justify-center gap-2 active:scale-95"
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