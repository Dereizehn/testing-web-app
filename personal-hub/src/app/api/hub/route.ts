import { NextRequest, NextResponse } from "next/server";
import { getDb, FinanceItem, TaskItem, NoteItem } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();

    const finance = db
      .prepare("SELECT * FROM finance_items ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, COALESCE(due_date, created_at) DESC, id DESC")
      .all() as unknown as FinanceItem[];

    const tasks = db
      .prepare("SELECT * FROM tasks ORDER BY completed ASC, starred DESC, COALESCE(due_date, '9999-12-31') ASC, id DESC")
      .all() as unknown as TaskItem[];

    const notes = db
      .prepare("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC, id DESC")
      .all() as unknown as NoteItem[];

    const budgetRow = db
      .prepare("SELECT value FROM settings WHERE key = 'monthly_budget'")
      .get() as { value: string } | undefined;

    return NextResponse.json({
      finance,
      tasks,
      notes,
      monthlyBudget: budgetRow ? Number(budgetRow.value) : 7500000,
    });
  } catch (error) {
    console.error("GET /api/hub error:", error);
    return NextResponse.json({ error: "Failed to fetch hub data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { entity, data } = body;

    if (entity === "finance") {
      const stmt = db.prepare(`
        INSERT INTO finance_items (title, amount, type, category, status, priority, due_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        data.title,
        Number(data.amount) || 0,
        data.type || "expense",
        data.category || "Umum",
        data.status || (data.type === "expense" ? "paid" : data.type === "must_pay" ? "pending" : "saved"),
        data.priority || "medium",
        data.due_date || null,
        data.notes || ""
      );
      return NextResponse.json({ ok: true, id: Number(res.lastInsertRowid) });
    }

    if (entity === "task") {
      const stmt = db.prepare(`
        INSERT INTO tasks (title, details, list_name, due_date, priority, completed, starred, subtasks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        data.title,
        data.details || "",
        data.list_name || "Tugas Utama",
        data.due_date || null,
        data.priority || "medium",
        data.completed ? 1 : 0,
        data.starred ? 1 : 0,
        JSON.stringify(data.subtasks || [])
      );
      return NextResponse.json({ ok: true, id: Number(res.lastInsertRowid) });
    }

    if (entity === "note") {
      const stmt = db.prepare(`
        INSERT INTO notes (title, icon, folder, content, tags, pinned)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        data.title || "Catatan Tanpa Judul",
        data.icon || "📝",
        data.folder || "Inbox",
        data.content || "",
        JSON.stringify(data.tags || []),
        data.pinned ? 1 : 0
      );
      return NextResponse.json({ ok: true, id: Number(res.lastInsertRowid) });
    }

    return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/hub error:", error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { entity, id, data } = body;

    if (entity === "budget") {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('monthly_budget', ?)").run(String(Number(data.monthlyBudget) || 0));
      return NextResponse.json({ ok: true });
    }

    if (entity === "finance") {
      if (data.convertToExpense) {
        // Marks must_pay as paid or want_to_buy as bought AND creates a corresponding expense record
        db.prepare("UPDATE finance_items SET status = ? WHERE id = ?").run(
          data.type === "must_pay" ? "paid" : "bought",
          Number(id)
        );
        const item = db.prepare("SELECT * FROM finance_items WHERE id = ?").get(Number(id)) as unknown as FinanceItem | undefined;
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
        return NextResponse.json({ ok: true });
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
      return NextResponse.json({ ok: true });
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
      return NextResponse.json({ ok: true });
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
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
  } catch (error) {
    console.error("PUT /api/hub error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get("entity");
    const id = Number(searchParams.get("id"));

    if (!entity || !id) {
      return NextResponse.json({ error: "Missing entity or id" }, { status: 400 });
    }

    if (entity === "finance") {
      db.prepare("DELETE FROM finance_items WHERE id = ?").run(id);
    } else if (entity === "task") {
      db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    } else if (entity === "note") {
      db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    } else {
      return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/hub error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
