// frontend/constants/colors.ts

export const COLOR_TOKENS = {
    brand: {
        primary: "#14B8A6",        // Teal cerah untuk teks & aksen di dark mode
        primaryHover: "#0D9488",
        emerald: "#10B981",        // Emerald menyala
        emeraldGlow: "rgba(16, 185, 129, 0.15)",
        tealGlow: "rgba(20, 184, 166, 0.15)",
    },
    accent: {
        cyan: "#06B6D4",
        sky: "#38BDF8",
        indigo: "#818CF8",
        purple: "#A855F7",
        amber: "#FBBF24",
        rose: "#FB7185",
    },
    surface: {
        appBg: "#090D16",          // Latar belakang utama (Deep Navy Dark)
        card: "#0E1526",           // Latar belakang kartu/panel
        cardHover: "#131C33",
        cardBorder: "#1E293B",     // Garis tepi kartu
        viewerDark: "#030712",     // Hitam pekat untuk viewer DICOM
    },
} as const;

export const THEME_CLASSES = {
    headerBadge: "bg-emerald-950/70 text-emerald-300 border border-emerald-500/30",
    primaryButton: "bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white shadow-lg shadow-teal-500/25",
    secondaryButton: "border border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700",
    cardActive: "border-teal-500/80 bg-teal-950/25 shadow-lg shadow-teal-950/40",
    cardIdle: "border-slate-800/90 bg-[#0E1526]/80 hover:border-slate-700 hover:bg-[#131C33]/60",
};