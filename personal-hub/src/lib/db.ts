import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

export interface FinanceItem {
  id: number;
  title: string;
  amount: number;
  type: "expense" | "must_pay" | "want_to_buy";
  category: string;
  status: "paid" | "pending" | "bought" | "saved";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  notes: string;
  created_at: string;
}

export interface SubtaskItem {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskItem {
  id: number;
  title: string;
  details: string;
  list_name: string;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  completed: number;
  starred: number;
  subtasks: string; // JSON string of SubtaskItem[]
  created_at: string;
}

export interface NoteItem {
  id: number;
  title: string;
  icon: string;
  folder: string;
  content: string;
  tags: string; // JSON string of string[]
  pinned: number;
  updated_at: string;
  created_at: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "personal-hub.db");

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS finance_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL CHECK(type IN ('expense', 'must_pay', 'want_to_buy')),
      category TEXT NOT NULL DEFAULT 'Umum',
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      list_name TEXT NOT NULL DEFAULT 'Tugas Utama',
      due_date TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      completed INTEGER NOT NULL DEFAULT 0,
      starred INTEGER NOT NULL DEFAULT 0,
      subtasks TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📝',
      folder TEXT NOT NULL DEFAULT 'Inbox',
      content TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      pinned INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Seed default monthly budget if not set
  const budgetRow = db.prepare("SELECT value FROM settings WHERE key = 'monthly_budget'").get() as { value: string } | undefined;
  if (!budgetRow) {
    db.prepare("INSERT INTO settings (key, value) VALUES ('monthly_budget', '7500000')").run();
  }

  // Seed sample data if database is completely empty
  const financeCount = (db.prepare("SELECT COUNT(*) as c FROM finance_items").get() as { c: number }).c;
  if (financeCount === 0) {
    const insertFinance = db.prepare(`
      INSERT INTO finance_items (title, amount, type, category, status, priority, due_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertFinance.run("Belanja Bulanan Supermarket", 650000, "expense", "Kebutuhan Pokok", "paid", "medium", "2026-10-25", "Beras, minyak, telur, sabun");
    insertFinance.run("Kopi & Makan Siang Kerja", 85000, "expense", "Makanan & Minuman", "paid", "low", "2026-10-28", "Meeting santai");
    insertFinance.run("Langganan Internet & Listrik", 720000, "must_pay", "Tagihan Rutin", "pending", "high", "2026-11-05", "Bayar sebelum tanggal 5 setiap bulan");
    insertFinance.run("Cicilan / Sewa Tempat Tinggal", 1850000, "must_pay", "Tempat Tinggal", "pending", "high", "2026-11-01", "Prioritas utama awal bulan");
    insertFinance.run("Mechanical Keyboard Wireless", 1250000, "want_to_buy", "Gadget & Kerja", "saved", "medium", "2026-11-20", "Tunggu diskon 11.11");
    insertFinance.run("Monitor Ultrawide 29 Inch", 2900000, "want_to_buy", "Setup Produktivitas", "saved", "high", "2026-12-15", "Untuk coding & desain");
  }

  const taskCount = (db.prepare("SELECT COUNT(*) as c FROM tasks").get() as { c: number }).c;
  if (taskCount === 0) {
    const insertTask = db.prepare(`
      INSERT INTO tasks (title, details, list_name, due_date, priority, completed, starred, subtasks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTask.run(
      "Review pengeluaran bulan ini & bayar tagihan wajib",
      "Cek daftar Must Paid sebelum tanggal 1",
      "Keuangan",
      "2026-10-30",
      "high",
      0,
      1,
      JSON.stringify([
        { id: "st-1", title: "Cek saldo rekening utama", done: true },
        { id: "st-2", title: "Lunasi tagihan internet & listrik", done: false },
      ])
    );
    insertTask.run(
      "Lanjutkan penulisan GDD Game Horror Sekolah (Bagian 3)",
      "Fokus pada siklus jam 22.20 dan mekanik pantulan kaca",
      "Proyek Game",
      "2026-10-29",
      "high",
      0,
      1,
      JSON.stringify([
        { id: "st-3", title: "Rancang teka-teki pantulan cermin kelas", done: false },
        { id: "st-4", title: "Tulis dialog bisikan Bagian 3", done: false },
      ])
    );
    insertTask.run(
      "Riset harga monitor di marketplace",
      "Bandingkan harga toko resmi untuk daftar Want to Buy",
      "Tugas Utama",
      "2026-11-02",
      "medium",
      0,
      0,
      "[]"
    );
  }

  const noteCount = (db.prepare("SELECT COUNT(*) as c FROM notes").get() as { c: number }).c;
  if (noteCount === 0) {
    const insertNote = db.prepare(`
      INSERT INTO notes (title, icon, folder, content, tags, pinned)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertNote.run(
      "Panduan Personal Hub",
      "🚀",
      "Workspace",
      `# Selamat Datang di Personal Hub!

Aplikasi ini menggabungkan **Manajemen Keuangan**, **Google Tasks**, dan **Notion/Obsidian Notes** dalam satu workspace lokal berbasis SQLite.

## Fitur UtamaCatatan (Hybrid Notion + Obsidian)
- Gunakan **[[Wiki-Links]]** untuk menghubungkan satu catatan ke catatan lain, misalnya: [[Rencana Keuangan Kuartal Ini]] atau [[GDD: Lorong Pukul 02.20]].
- Lihat panel **Backlinks** di bawah editor dan **Graph View** untuk melihat peta jaringan catatan Anda.
- Gunakan checklist markdown:
- [x] Setup database SQLite lokal
- [x] Buat kategori Pengeluaran, Must Paid, dan Want to Buy
- [ ] Mulai catat transaksi dan ide harian

> 💡 **Tips:** Klik tombol **Sudah Dibeli / Tandai Lunas** di halaman Keuangan untuk otomatis memindahkan item *Must Paid* atau *Want to Buy* menjadi catatan *Pengeluaran*!`,
      JSON.stringify(["panduan", "produktivitas", "sistem"]),
      1
    );

    insertNote.run(
      "Rencana Keuangan Kuartal Ini",
      "💰",
      "Keuangan",
      `# Strategi Keuangan & Prioritas Belanja

Catatan ini terhubung dengan [[Panduan Personal Hub]].

## Aturan Alokasi Bulanan
1. **Must Paid (Kewajiban Utama):** Maksimal 50% dari anggaran bulanan.
2. **Pengeluaran Harian:** Maksimal 30% dari anggaran.
3. **Tabungan & Want to Buy:** Sisihkan 20% sebelum membeli barang di wishlist.

## Evaluasi Wishlist
- Sebelum membeli item di daftar *Want to Buy*, tunggu minimal **7 hari** untuk menghindari *impulse buying*.
- Pastikan semua item di **Must Paid** bulan berjalan sudah berstatus **Lunas**.`,
      JSON.stringify(["keuangan", "budgeting"]),
      1
    );

    insertNote.run(
      "GDD: Lorong Pukul 02.20",
      "🕯️",
      "Game Design",
      `# Konsep Game: Lorong Pukul 02.20

Terhubung ke [[Panduan Personal Hub]].

## Mainline Alur Cerita
Bangun → Mencari jalan keluar → Menemukan kejanggalan → Mengingat masa lalu → Menemukan hubungan dengan insiden → Menghadapi kebenaran → Menghadapi rasa bersalah → Memilih menerima, melupakan atau mengakhiri.

## Siklus Waktu Mundur (Reverse Time-Loop)
- **Bagian 1 (02.20):** Pantulan kaca bergerak sedikit berbeda. Bisikan: *"Kamu... Lupa?"*
- **Bagian 2 (00.20):** Pantulan kaca penuh bercak darah. Bisikan: *"Salah... Kamu."*
- **Bagian 3 (22.20):** Sekolah terkunci rapat, petunjuk insiden mulai terbuka.
- **Bagian 4 (20.20):** Konfrontasi puncak & 3 pilihan Ending.`,
      JSON.stringify(["game-dev", "gdd", "horror"]),
      0
    );
  }

  dbInstance = db;
  return db;
}
