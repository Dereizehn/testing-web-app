import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Hub — Keuangan, Google Tasks & Notion/Obsidian Notes",
  description:
    "Workspace pribadi terpadu untuk manajemen keuangan (Pengeluaran, Must Paid, Want to Buy), Google Tasks, dan Catatan ala Notion/Obsidian dengan database SQLite lokal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
