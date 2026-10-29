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
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
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