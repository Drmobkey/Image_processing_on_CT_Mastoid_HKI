import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
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
    <html lang="id">
      <body className={`${plusJakartaSans.className} antialiased bg-white text-slate-800`}>
        {children}
      </body>
    </html>
  );
}
