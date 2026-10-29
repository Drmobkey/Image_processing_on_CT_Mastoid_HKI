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
        </div>
      </header>
    </div>
  )
}