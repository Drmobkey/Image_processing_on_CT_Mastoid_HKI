"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Scan,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  XCircle,
  Check,
  AlertCircle,
  Files,
} from "lucide-react";

export default function MastoidLabApp() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [fusionWeight, setFusionWeight] = useState<number>(50);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [fileData, setFileData] = useState<{
    name: string;
    size: string;
    dimensions: string;
    windowWidth: number;
    windowLevel: number;
  } | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string>("");

  const [selectedMethod, setSelectedMethod] = useState<string>("kontras");
  const [processStatus, setProcessStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [processError, setProcessError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const methods = [
    {
      id: "kontras",
      tittle: "Peningkatan kontras",
      desc: "Perjelas Perbedaan intensitas pada citra.",
    },
    {
      id: "hp1",
      tittle: "High-Pass Filter · Kernel 1",
      desc: "Tonjolkan detail tepi dengan kernel 1.",
    }, {
      id: "hp2",
      tittle: "High-Pass Filter · Kernel 2",
      desc: "Pertajam detail citra dengan kernel 2.",
    }, {
      id: "hp3",
      tittle: "High-Pass Filter · Kernel 3",
      desc: "Gunakan alternatif penajaman dengan kernel 3.",
    }, {
      id: "fusi",
      tittle: "Fusi Citra",
      desc: "Gabungkan citra asli dengan hasil pemfilteran.",
    },
  ];

  // FUNGSI UTAMA PEMROSESAN FILE
  const processFile = (file: File) => {
    if (!file) return;

    setUploadError("");
    setUploadProgress(0);

    if (!file.name.toLocaleLowerCase().endsWith(".dcm")) {
      setUploadStatus("error");
      setUploadError(
        "Format file tidak didukung. Harap unggah file .dcm (DICOM)"
      );
      return;
    }

    setUploadStatus("uploading");

    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadProgress(100);
        setUploadStatus("success");

        setPreviewUrl("https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=800&auto=format&fit=crop");

        setFileData({
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          dimensions: "512 x 512 px",
          windowWidth: 2000,
          windowLevel: 400,
        });

        setTimeout(() => setCurrentStep(2), 500);
      } else {
        setUploadProgress(progress)
      }
    }, 200);
  };

  // HANDLE ZOOM
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handeZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  // HANDLER PILIH FILE
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // HANDLER DRAG & DROP
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }

  const handleProcessImage = (simulateError = false) => {
    setProcessStatus("processing");
    setProcessProgress(0);
    setProcessError("");

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      if (progress >= 100) {
        clearInterval(interval);

        if (simulateError) {
          setProcessStatus("error");
          setProcessProgress(0);
          setProcessError("Gagal memproses citra: Terjadi kesalahan internal pada server pemrosesan (DICOM Corrupted).");
        } else {
          setProcessProgress(100);
          setProcessStatus("success");
          setTimeout(() => setCurrentStep(3), 500);
        }
      } else {
        setProcessProgress(progress);
      }
    }, 250);
  };

  // RESET TOTAL STATE UNTUK FILE BARU
  const handleReset = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFileData(null);
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadError("");
    setProcessStatus("idle");
    setProcessProgress(0);
    setProcessError("");
    setCurrentStep(1);
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white px-6 md:px-12 py-6 text-[#1E293B">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".dcm"
        className="hidden" />
      <header>
        <div className="flex justify-between items-start border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-widerr text-[#467975] font-mono">MASTOIDLAB</h1>
            <p className="text-sm text-slate-400 font-medium">Peningkatan Citra CT</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span className="text-xs text-slate-400 font-medium">
              Alat penelitian
            </span>

            {currentStep === 2 && (
              <span className="bg-[#E6F7F5] text-[#0d7A75] text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                File berhasil diunggah
              </span>
            )}
            {currentStep === 3 && (
              <span className="bg-[#E6F7F5] text-[#0d7A75] text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Pemrosesan selesai
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center py-4 text-xs font-medium border-b border-slate-100 mb-8">
          <div className="text-[#0D7A75] font-semibold">
            0 {currentStep} / 03
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span
              onClick={() => { handleReset }}
              className={`cursor-pointer hover:text-[#0D7A75] transition ${currentStep === 1 ? "text-slate-800 font-bold" : ""}`}>
              Unggah Citra
            </span>
            <span>/</span>
            <span
              onClick={() => fileData && setCurrentStep(2)}
              className={`transition ${fileData ? "cursor-pointer hover:text-[#0D7A75]" : "opacity-40 cursor-not-allowed"
                } ${currentStep === 2 ? "text-slate-800 font-bold" : ""}`}>
              Pilih metode
            </span>
            <span>/</span>
            <span
              onClick={() => processStatus === "success" && setCurrentStep(3)}
              className={`transition ${processStatus === "success" ? "cursor-pointer hover:text-[#0D7A75]" : "opacity-40 cursor-not-allowed"
                } ${currentStep === 3 ? "text-slate-800 font-bold" : ""}`}>
              Tinjau Hasil
            </span>
          </div>
        </div>
      </header>

      {/* PAGE 1: UPLOAD CITRA */}
      <main className="flex-grow">
        {currentStep === 1 && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-extrabold text-[#467975] tracking-tight">
                Perjelas citra CT Anda
              </h2>
              <p className="text-slate-400 text-sm max-w-xl mx-auto">
                Unggah citra CT, Pilih metode pemrosesan, lalu bandingkan hasilnya dalam satu alur sederhana.
              </p>
            </div>

            {/* DROPZONE AREA */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center space-y-4 transition-all duration-200 ${isDragging ? "bg-[#D1F2ED] border-[#0D7A75] scale-[1.01]"
                : "bg-[#EAF8F6] border-[#0D7A75]/40"
                }`}>

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
                      className="bg-[#0D7A75] hover:bg-[#0B6863] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-all shadow-sm">
                      Pilih File
                    </button>
                  </div>
                </div>
              )}

              {uploadStatus === "uploading" && (
                <div className="max-w-xs mx-auto space-y-3 py-2">
                  <div className="flex justify-between text-xs font-semibold text-[#0D7A75]">
                    <span>Mengunggah file ...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#0D7A75] h-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Mohon tunggu, sistem sedang memverifikasi file.
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
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition">
                    Coba pilih file lain
                  </button>
                </div>
              )}
              <p className="text-[11px] text-slate-400 pt-2">
                Format yang didukung: DICOM (.dcm) * Satu file per proses
              </p>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="bg-[#F8FAFC] p-5 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-[#0D7A75]">01</span>
                <h4 className="font-semibold text-sm text-slate-800">Unggah Citra</h4>
                <p className="text-xs text-slate-400">Pilih satu file CT dalam format DICOM.</p>
              </div>
              <div className="bg-[#F8FAFC] p-5 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-[#0D7A75]">02</span>
                <h4 className="font-semibold text-sm text-slate-800">Pilih metode</h4>
                <p className="text-xs text-slate-400">Sesuaikan pemrosesan dengan kebutuhan visualisasi.</p>
              </div>
              <div className="bg-[#F8FAFC] p-5 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-[#0D7A75]">03</span>
                <h4 className="font-semibold text-sm text-slate-800">Tinjau dan ekspor</h4>
                <p className="text-xs text-slate-400">Bandingkan citra asli dan hasil, lalu simpan hasilnya.</p>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: PILIH METODE */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-3xl font-extrabold text-[#467975] tracking-tight">
                Atur pemroses citra
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Tinjau file yang diunggah dan pilih metode untuk meningkatkan visualisasi citra CT.
              </p>
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
                  className="flex items-center gap-1.5 text-xs bg-red-600 text-white px-3 py-1.5 hover:bg-red-700 transition rounded-lg">
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
                        Citra DICOM • {fileData?.dimensions} ({fileData?.size})
                      </p>
                    </div>
                  </div>
                  <span className="bg-[#E6F7F5] text-[#0D7A75] text-xs font-medium px-4 py-2 rounded-xl">
                    File tervalidasi
                  </span>
                </div>

                {/* DISPLAY GAMBAR CT */}
                <div className="bg-[#0B0F17] rounded-xl h-112 flex flex-col items-center justify-center text-slate-400 space-y-2 relative overflow-hidden group">
                  {previewUrl ? (
                    <>
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-lgg border border-slate-700/50 text-white text-xs">
                        <button
                          onClick={handeZoomOut}
                          className="px-2 py-1 hover:bg-slate-700 rounded transition"
                          title="Zoom Out">
                          -
                        </button>
                        <span className="px-1 text-[11px] text-slate-300 font-mono">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                          onClick={handleZoomIn}
                          className="px-2 py-1 hover:bg-slate-700 rounded transition"
                          title="Zoom In">
                          +
                        </button>
                        {zoomLevel !== 1 && (
                          <button
                            onClick={handleResetZoom}
                            className="px-2 py-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition text-[10px]">
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                        <img src={previewUrl} alt="Preview CT asli"
                          className="w-full h-full object-cover rounded-xl opacity-80 groud-hover:opacity-100 transition duration-300" />
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
                        Penampil citra DICOM
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-400">
                    Tinjau citra sebelum melanjutkan
                  </p>
                  <button
                    onClick={handleReset}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg transition">
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
                    Pilih satu metode untuk diterapkan pada citra Anda.
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
                          }`}>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-800">
                            {method.tittle}
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

                  {selectedMethod === "fusi" ? (
                    <div className="bg-[#EAF8F6] border border-[#0D7A75]/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center text-xs font-medium text-slate-700">
                        <span className="font-semibold text-[#0D7A75]">
                          Parameter Bobot Fusi Citra
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-[#0D7A75] text-xs">
                          {/* Input Manual Persentase Filtered */}
                          <div className="flex items-center bg-white border border-slate-200 rounded px-1.5 py-0.5 focus-within:border-[#0D7A75] transition">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={fusionWeight}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val < 0) setFusionWeight(0);
                                else if (val > 100) setFusionWeight(100);
                                else setFusionWeight(val);
                              }}
                              className="w-8 text-right focus:outline-none text-[#0D7A75] font-semibold font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-slate-400 ml-0.5">%</span>
                          </div>
                          <span className="text-slate-500 font-sans">Filtered /</span>
                          {/* Persentase Asli (Otomatis 100 - fusionWeight) */}
                          <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-semibold">
                            {100 - fusionWeight}% Asli
                          </span>
                        </div>
                      </div>

                      {/* Range Slider dengan Thumb Bulat Sempurna */}
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={fusionWeight}
                        onChange={(e) => setFusionWeight(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0D7A75] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#0D7A75] [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-[#0D7A75] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none"
                      />

                      <p className="text-[11px] text-slate-500">
                        Geser slider atau ketik angka secara manual untuk mengatur tingkat proporsi penggabungan detail filter terhadap citra CT asli.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 space-y-1">
                      <p className="text-xs font-medium text-slate-700">
                        Window Width: {fileData?.windowWidth} · Window Level: {fileData?.windowLevel}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Parameter dari file unggahan. Periksa kembali sebelum memproses.
                      </p>
                    </div>
                  )}
                </div>

                {/* DICOM METADATA */}
                <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-medium text-slate-700">
                    Window Width: {fileData?.windowWidth?.toString()} • Window Level: {fileData?.windowLevel?.toString()}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Parameter dari file unggahan. Periksa kembali sebelum memproses
                  </p>
                </div>
              </div>

              {/* AKSI DAN PROGRESS BAR (Memakai col-span-12 agar rapi di bawah grid) */}
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
                      Diproses menggunakan layanan pemrosesan citra yang terhubung.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleProcessImage(true)}
                        className="text-xs text-red-500 hover:underline px-2 py-1">
                        [tes error]
                      </button>
                      <button
                        onClick={() => handleProcessImage(false)}
                        className="bg-[#0D7A75] hover:bg-[#0B6863] text-white text-sm font-medium px-8 py-2.5 rounded-lg transition-all shadow-sm">
                        Proses citra
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 3: HASIL PEMROSESAN */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-3xl font-extrabold text-[#0D7A75] tracking-tight">
                Hasil pemrosesan citra
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Bandingkan citra asli dengan hasil pemroses sebelum menyimpan hasilnya.
              </p>
            </div>

            {/* BANNER SUCCESS */}
            <div className="bg-[#EAF8F6] border border-[#0D7A75]/20 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-[#0D7A75]">
                Citra berasil diproses
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Metode:{" "}
                {methods.find((m) => m.id === selectedMethod)?.tittle} •{""}
                {fileData?.name}
              </p>
            </div>

            {/* PERBANDINGAN CITRA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CITRA ASLI */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800 text-sm">Citra asli</h3>
                <div className="bg-[#0B0F17] rounded-2xl h-80 flex flex-col items-center justify-center text-slate-400 space-y-2 overflow-hidden relative">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="CT Asli"
                      className="w-full h-full object-cover rounded-2xl opacity-80"
                    />
                  ) : (
                    <p className="text-white text-sm font-medium">CT asli</p>
                  )}
                </div>
              </div>
              {/* HASIL PEMROSESAN */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800 text-sm">Hasil pemrosesan</h3>
                <div className="bg-[#0B0F17] rounded-2xl h-80 flex flex-col items-center justify-center text-slate-400 space-y-2 overflow-hidden relative">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="CT Hasil Pemrosesan"
                      className="w-full h-full object-cover rounded-2xl contrast-125 brightness-110" // Filter CSS simulasi efek pemrosesan
                    />
                  ) : (
                    <p className="text-white text-sm font-medium">CT setelah pemrosesan</p>
                  )}
                </div>
              </div>
            </div>

            {/* AKSI (PROSES FILE LAIN) */}
            <div className="flex flex-xol sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-5 py-2.5 rounded-lg transition">
                  Proses file lain
                </button>
                <p className="text-xs text-slate-400 hidden lg:block">
                  Tinjau kedua citra sebagai referensi visual penelitian Anda.
                </p>
              </div>

              <button className="w-full sm:w-auto bg-[#0D7A75] hover:bg-[#0B6863] text-white font-medium px-8 py-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center gap-2">
                Unduh hasil
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 border-t border-slate-100 pt-5 mt-8 gap-2">
        <p>MastoidLab · Pemrosesan citra CT mastoid</p>
        <p>
          Untuk penelitian dan visualisasi citra, bukan untuk diagnosis klinis.
        </p>
      </footer>
    </div>
  )
}