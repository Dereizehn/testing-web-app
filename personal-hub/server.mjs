import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "personal-hub.db");
const PUBLIC_INDEX = path.join(__dirname, "public", "index.html");

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

// Seed initial data if empty
const budgetRow = db.prepare("SELECT value FROM settings WHERE key = 'monthly_budget'").get();
if (!budgetRow) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('monthly_budget', '7500000')").run();
}

const financeCount = db.prepare("SELECT COUNT(*) as c FROM finance_items").get().c;
if (financeCount === 0) {
  const ins = db.prepare(`
    INSERT INTO finance_items (title, amount, type, category, status, priority, due_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  ins.run("Belanja Bulanan Supermarket", 650000, "expense", "Kebutuhan Pokok", "paid", "medium", "2026-10-25", "Beras, minyak, telur, sabun");
  ins.run("Kopi & Makan Siang Kerja", 85000, "expense", "Makanan & Minuman", "paid", "low", "2026-10-28", "Meeting santai");
  ins.run("Langganan Internet & Listrik", 720000, "must_pay", "Tagihan Rutin", "pending", "high", "2026-11-05", "Bayar sebelum tanggal 5 setiap bulan");
  ins.run("Cicilan / Sewa Tempat Tinggal", 1850000, "must_pay", "Tempat Tinggal", "pending", "high", "2026-11-01", "Prioritas utama awal bulan");
  ins.run("Mechanical Keyboard Wireless", 1250000, "want_to_buy", "Gadget & Kerja", "saved", "medium", "2026-11-20", "Tunggu diskon 11.11");
  ins.run("Monitor Ultrawide 29 Inch", 2900000, "want_to_buy", "Setup Produktivitas", "saved", "high", "2026-12-15", "Untuk coding & desain");
}

const taskCount = db.prepare("SELECT COUNT(*) as c FROM tasks").get().c;
if (taskCount === 0) {
  const ins = db.prepare(`
    INSERT INTO tasks (title, details, list_name, due_date, priority, completed, starred, subtasks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  ins.run(
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
  ins.run(
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
  ins.run(
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

const noteCount = db.prepare("SELECT COUNT(*) as c FROM notes").get().c;
if (noteCount === 0) {
  const ins = db.prepare(`
    INSERT INTO notes (title, icon, folder, content, tags, pinned)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  ins.run(
    "Panduan Personal Hub",
    "🚀",
    "Workspace",
    `# Selamat Datang di Personal Hub!

Aplikasi ini menggabungkan **Manajemen Keuangan**, **Google Tasks**, dan **Notion/Obsidian Notes** dalam satu workspace lokal berbasis SQLite.

## Fitur Utama Catatan (Hybrid Notion + Obsidian)
- Gunakan **[[Wiki-Links]]** untuk menghubungkan satu catatan ke catatan lain, misalnya: [[Rencana Keuangan Kuartal Ini]] atau [[GDD: Lorong Pukul 02.20]].
- Lihat panel **Backlinks** di bawah editor dan **Graph View** untuk melihat peta jaringan catatan Anda.
- Gunakan checklist markdown:
- [x] Setup database SQLite lokal
- [x] Buat kategori Pengeluaran, Must Paid, dan Want to Buy
- [ ] Mulai catat transaksi dan ide harian

> 💡 **Tips:** Klik tombol **Lunasi / Beli** di halaman Keuangan untuk otomatis memindahkan item *Must Paid* atau *Want to Buy* menjadi catatan *Pengeluaran*!`,
    JSON.stringify(["panduan", "produktivitas", "sistem"]),
    1
  );

  ins.run(
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

  ins.run(
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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/hub") {
    try {
      if (req.method === "GET") {
        const finance = db
          .prepare("SELECT * FROM finance_items ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, COALESCE(due_date, created_at) DESC, id DESC")
          .all();
        const tasks = db
          .prepare("SELECT * FROM tasks ORDER BY completed ASC, starred DESC, COALESCE(due_date, '9999-12-31') ASC, id DESC")
          .all();
        const notes = db
          .prepare("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC, id DESC")
          .all();
        const bRow = db.prepare("SELECT value FROM settings WHERE key = 'monthly_budget'").get();
        return sendJson(res, 200, {
          finance,
          tasks,
          notes,
          monthlyBudget: bRow ? Number(bRow.value) : 7500000,
        });
      }

      if (req.method === "POST") {
        const { entity, data } = await readJsonBody(req);
        if (entity === "finance") {
          const r = db
            .prepare(`
              INSERT INTO finance_items (title, amount, type, category, status, priority, due_date, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
              data.title,
              Number(data.amount) || 0,
              data.type || "expense",
              data.category || "Umum",
              data.status || (data.type === "expense" ? "paid" : data.type === "must_pay" ? "pending" : "saved"),
              data.priority || "medium",
              data.due_date || null,
              data.notes || ""
            );
          return sendJson(res, 200, { ok: true, id: Number(r.lastInsertRowid) });
        }

        if (entity === "task") {
          const r = db
            .prepare(`
              INSERT INTO tasks (title, details, list_name, due_date, priority, completed, starred, subtasks)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .run(
              data.title,
              data.details || "",
              data.list_name || "Tugas Utama",
              data.due_date || null,
              data.priority || "medium",
              data.completed ? 1 : 0,
              data.starred ? 1 : 0,
              JSON.stringify(data.subtasks || [])
            );
          return sendJson(res, 200, { ok: true, id: Number(r.lastInsertRowid) });
        }

        if (entity === "note") {
          const r = db
            .prepare(`
              INSERT INTO notes (title, icon, folder, content, tags, pinned)
              VALUES (?, ?, ?, ?, ?, ?)
            `)
            .run(
              data.title || "Catatan Baru",
              data.icon || "📝",
              data.folder || "Inbox",
              data.content || "",
              JSON.stringify(data.tags || []),
              data.pinned ? 1 : 0
            );
          return sendJson(res, 200, { ok: true, id: Number(r.lastInsertRowid) });
        }
      }

      if (req.method === "PUT") {
        const { entity, id, data } = await readJsonBody(req);
        if (entity === "budget") {
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('monthly_budget', ?)").run(
            String(Number(data.monthlyBudget) || 0)
          );
          return sendJson(res, 200, { ok: true });
        }

        if (entity === "finance") {
          if (data.convertToExpense) {
            db.prepare("UPDATE finance_items SET status = ? WHERE id = ?").run(
              data.type === "must_pay" ? "paid" : "bought",
              Number(id)
            );
            const item = db.prepare("SELECT * FROM finance_items WHERE id = ?").get(Number(id));
            if (item) {
              db.prepare(`
                INSERT INTO finance_items (title, amount, type, category, status, priority, due_date, notes)
                VALUES (?, ?, 'expense', ?, 'paid', ?, date('now', 'localtime'), ?)
              `).run(
                `${item.type === "must_pay" ? "[Tagihan] " : "[Wishlist] "}${item.title}`,
                item.amount,
                item.category,
                item.priority,
                item.notes
              );
            }
            return sendJson(res, 200, { ok: true });
          }

          db.prepare(`
            UPDATE finance_items
            SET title = ?, amount = ?, type = ?, category = ?, status = ?, priority = ?, due_date = ?, notes = ?
            WHERE id = ?
          `).run(
            data.title,
            Number(data.amount) || 0,
            data.type,
            data.category || "Umum",
            data.status,
            data.priority || "medium",
            data.due_date || null,
            data.notes || "",
            Number(id)
          );
          return sendJson(res, 200, { ok: true });
        }

        if (entity === "task") {
          db.prepare(`
            UPDATE tasks
            SET title = ?, details = ?, list_name = ?, due_date = ?, priority = ?, completed = ?, starred = ?, subtasks = ?
            WHERE id = ?
          `).run(
            data.title,
            data.details || "",
            data.list_name || "Tugas Utama",
            data.due_date || null,
            data.priority || "medium",
            data.completed ? 1 : 0,
            data.starred ? 1 : 0,
            typeof data.subtasks === "string" ? data.subtasks : JSON.stringify(data.subtasks || []),
            Number(id)
          );
          return sendJson(res, 200, { ok: true });
        }

        if (entity === "note") {
          db.prepare(`
            UPDATE notes
            SET title = ?, icon = ?, folder = ?, content = ?, tags = ?, pinned = ?, updated_at = datetime('now', 'localtime')
            WHERE id = ?
          `).run(
            data.title,
            data.icon || "📝",
            data.folder || "Inbox",
            data.content || "",
            typeof data.tags === "string" ? data.tags : JSON.stringify(data.tags || []),
            data.pinned ? 1 : 0,
            Number(id)
          );
          return sendJson(res, 200, { ok: true });
        }
      }

      if (req.method === "DELETE") {
        const entity = url.searchParams.get("entity");
        const id = Number(url.searchParams.get("id"));
        if (entity === "finance") db.prepare("DELETE FROM finance_items WHERE id = ?").run(id);
        if (entity === "task") db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
        if (entity === "note") db.prepare("DELETE FROM notes WHERE id = ?").run(id);
        return sendJson(res, 200, { ok: true });
      }
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: String(err) });
    }
  }

  // Serve UI
  if (fs.existsSync(PUBLIC_INDEX)) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(PUBLIC_INDEX, "utf-8"));
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Personal Hub Server + SQLite aktif di: http://localhost:${PORT}`);
  console.log(`📂 Database SQLite: ${DB_PATH}\n`);
});
