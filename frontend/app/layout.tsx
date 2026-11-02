import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Righteous } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const righteous = Righteous({
  weight: "400",
  variable: "--font-righteous",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MastoidLab - Peningkatan Citra CT",
  description: "Alat penelitian dan pemrosesan citra CT Mastoid",
};

export default function RootLayout({ children, }: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className={`${plusJakartaSans.className} ${righteous.variable} antialiased bg-[#090D16] text-slate-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
