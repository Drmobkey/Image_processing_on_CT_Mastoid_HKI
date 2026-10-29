"use client";

import React, { useState } from "react";
import {
  Upload,
  FileText,
  Scan,
  CheckCircle2,
  Download,
  RotateCcw,
  Maximize,
  Check,
} from "lucide-react";

export default function MastoidLabApp() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedMethod, setSelectedMethod] = useState<string>("kontras");

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

  return (
    <div className="min-h-screen flex flex-col justify-between bg-white px-6 md:px-12 py-6 text-[#1E293B">
      <header>
        <div className="flex justify-between items-start border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-widerr text-[#467975] font-mono">MASTOIDLAB</h1>
            <p className="tex-sm text-slate-400 font-medium">Peningkatan Citra CT</p>
          </div>
          <div className="flex items-center gap-3">
            {currentStep === 2 && (
              <span className="bg=#E6F7F5] text-[#0d7A75] text-xs font-semibold px-1.5 rounded-full fle items-center gap-1.5">
                <CheckCircle2 size={14} />
                File berhasil diunggah
              </span>
            )}
            {currentStep === 3 && (
              <span className="bg=#E6F7F5] text-[#0d7A75] text-xs font-semibold px-1.5 rounded-full fle items-center gap-1.5">
                <CheckCircle2 size={14} />
                Pemrosesan selesai
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">
              Alat penelitian
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center py-4 text-xs font-medium border-b border-slate-100 mb-8">
          <div className="text-[#0D7A75] font-semibold">
            0 {currentStep} / 03
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span
              onClick={() => setCurrentStep(1)}
              className={`cursor-pointer hover:text-[#0D7A75] transition ${currentStep === 1 ? "text-slate-800 font-bold" : ""}`}>
              Unggah Citra
            </span>
            <span>/</span>
            <span
              onClick={() => setCurrentStep(2)}
              className={`cursor-pointer hover:text-[#0D7A75] transition ${currentStep === 2 ? "text-slate-800 font-bold" : ""}`}>
              Pilih metode
            </span>
            <span>/</span>
            <span
              onClick={() => setCurrentStep(3)}
              className={`cursor-pointer hover:text-[#0D7A75] transition ${currentStep === 3 ? "text-slate-800 font-bold" : ""}`}>
              Tinjau Hasil
            </span>
          </div>
        </div>
      </header>

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

            <div className="bg-[#EAF8F6] border-2 border-dashed border-[#0D7A75]/40 rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 bg-[#D1F2ED] rounded-full flex items-center justify-center mx-auto text-[#0D7A75]">
                <Upload className="2-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-slate-800">
                  Letakkan file CT Anda di sini
                </h3>
                <p className="text-xs text-slate-400">
                  Seret file ke are ini atau pilih file dari perangkat Anda.
                </p>
              </div>
              <div>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-[#0D7A75] hover:bg-[#0B6863] text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-all shadow-sm">
                  Pilih File
                </button>
              </div>
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#E6F7F5] text-[#467975] rounded-xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#467975] text-base">
                        mastoid_scan.dcm
                      </h3>
                      <p className="text-xs text-slate-400">
                        Citra DICOM • 512 x 512 px
                      </p>
                    </div>
                  </div>
                  <span className="bg-[#E6F7F5] text-[#0D7A75] text-xs font-medium px-8 py-3 rounded-xl">
                    File tervalidasi
                  </span>
                </div>

                <div className="bg-[#0B0F17] rounded-xl h-112 flex flex-col items-center justify-center text-slate-400 space-y-2 relative overflow-hidden">
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

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-400">
                    Tinjaui citra sebelum melanjutkan
                  </p>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium px-4 py-2 rounded-lg transition">
                    Ganti file
                  </button>
                </div>
              </div>

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
                        className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between ${isSelected ? "bg-[#EAF8F6] border-[#0D7A75]" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                        <div>
                          <h4 className="text-sm font-semibld text-slate-800">
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
                            <div className="w-5 h-5 rounded-full border bordre-slate-300 bg-slate-100"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-medium text-slate-700">
                    Window Width: 2000 • Window Level: 400
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Parameter dari file unggahan. Periksa kembali sebelum memproses
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <p className="text-xs tex-slate-400">
                    Pemroses menggunakan layanan pemroses citra yang terhubung
                  </p>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="bg-[#0D7A75] hover:bg-[#0B6863] text-white text-sm font-medium px-8 py-2.5 rounded-lg transition-all shadow-sm">
                    Proses Citra
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-3xl font-extrabold text-[#0D7A75] tracking-tight">
                Hasil pemroses citra
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Bandingkan citra asli dengan hasil pemroses sebelum menyimpan hasilnya.
              </p>
            </div>

            <div className="bg-[#EAF8F6] border border-[#0D7A75] /20 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-[#0D7A75]">
                Citra berhasil diproses
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Metode: Peningkatan kontras (Contrast Enhancement) • mastoid_scan.dcm
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800 text-sm">
                  Citra asli
                </h3>
                <div className="bg-[#0B0F17] rounded-2xl h-80 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <div className="text-slate-500 tracking-widest text-lg font-mono">
                    [ ]
                  </div>
                  <p className="text-white text-sm font-medium">CT asli</p>
                  <p className="text-xs text-slate-500">Citra sumben tanpa pemrosesan</p>
                </div>
              </div>
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