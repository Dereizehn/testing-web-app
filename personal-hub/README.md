# Personal Hub — Keuangan, Google Tasks & Notion/Obsidian Notes

Aplikasi web *all-in-one* berbasis **Next.js (App Router) + React + Tailwind CSS** dan **Database SQLite Lokal (`node:sqlite`)** untuk mengelola:
1. **Keuangan Pribadi (`finance_items`)**:
   - **Pengeluaran (Expenses)**
   - **Must Paid (Tagihan Wajib)** — lengkap dengan tombol 1-klik *"Lunasi"* yang otomatis memindahkan tagihan ke catatan Pengeluaran.
   - **Want to Buy (Wishlist)** — lengkap dengan prioritas, target tanggal, dan tombol 1-klik *"Beli"* yang otomatis mencatat ke Pengeluaran.
2. **Penjadwalan seperti Google Tasks (`tasks`)**:
   - Multi-list (*Tugas Utama, Keuangan, Proyek Game*, dll.), filter Berbintang ⭐, tenggat waktu, dan *sub-tasks* (checklist bersarang).
3. **Notes Studio seperti Notion & Obsidian (`notes`)**:
   - **Gaya Notion:** Pemilih ikon emoji halaman, folder, pin halaman, dan *Quick Block Toolbar* (`H2`, `Checklist`, `Callout`).
   - **Gaya Obsidian:** Dukungan tautan dua arah **`[[Wiki-Links]]`**, panel **Backlinks** otomatis di bawah setiap halaman, serta **Interactive Graph View** untuk melihat peta jaringan catatan.

## Cara Menjalankan

```bash
cd "d:\General Use\personal-hub"
npm install
npm run dev
```

Lalu buka **http://localhost:3000** di browser Anda.
Database SQLite otomatis dibuat dan disimpan di `d:\General Use\personal-hub\data\personal-hub.db`.
