"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Wallet,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Plus,
  Trash2,
  Star,
  Calendar,
  Tag,
  Network,
  Search,
  CheckCircle2,
  Circle,
  AlertCircle,
  ShoppingBag,
  Receipt,
  CreditCard,
  Pin,
  FolderOpen,
  Link2,
  Edit3,
  Eye,
  Columns,
  Sparkles,
  ArrowUpRight,
  Check,
} from "lucide-react";

interface FinanceItem {
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

interface SubtaskItem {
  id: string;
  title: string;
  done: boolean;
}

interface TaskItem {
  id: number;
  title: string;
  details: string;
  list_name: string;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  completed: number;
  starred: number;
  subtasks: string;
  created_at: string;
}

interface NoteItem {
  id: number;
  title: string;
  icon: string;
  folder: string;
  content: string;
  tags: string;
  pinned: number;
  updated_at: string;
  created_at: string;
}

type ActiveTab = "dashboard" | "finance" | "tasks" | "notes";
type FinanceFilter = "all" | "expense" | "must_pay" | "want_to_buy";
type NoteViewMode = "split" | "edit" | "preview" | "graph";

const formatIDR = (val: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val || 0);

const EMOJI_OPTIONS = ["📝", "🚀", "💰", "🕯️", "💡", "📚", "🎯", "🧠", "⚡", "🗂️", "🎮", "🛠️"];

export default function PersonalHubPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [finance, setFinance] = useState<FinanceItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(7500000);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("7500000");
  const [searchQuery, setSearchQuery] = useState("");

  // Finance States
  const [financeFilter, setFinanceFilter] = useState<FinanceFilter>("all");
  const [finTitle, setFinTitle] = useState("");
  const [finAmount, setFinAmount] = useState("");
  const [finType, setFinType] = useState<"expense" | "must_pay" | "want_to_buy">("expense");
  const [finCategory, setFinCategory] = useState("Kebutuhan Pokok");
  const [finPriority, setFinPriority] = useState<"low" | "medium" | "high">("medium");
  const [finDueDate, setFinDueDate] = useState("");
  const [finNotes, setFinNotes] = useState("");

  // Google Tasks States
  const [selectedTaskList, setSelectedTaskList] = useState<string>("ALL");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [taskListName, setTaskListName] = useState("Tugas Utama");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<number, string>>({});

  // Notion / Obsidian Notes States
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [noteViewMode, setNoteViewMode] = useState<NoteViewMode>("split");
  const [selectedFolder, setSelectedFolder] = useState<string>("ALL");
  const [newTagInput, setNewTagInput] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchHubData = async () => {
    try {
      const res = await fetch("/api/hub");
      const json = await res.json();
      if (json.finance) setFinance(json.finance);
      if (json.tasks) setTasks(json.tasks);
      if (json.notes) {
        setNotes(json.notes);
        if (selectedNoteId === null && json.notes.length > 0) {
          setSelectedNoteId(json.notes[0].id);
        }
      }
      if (typeof json.monthlyBudget === "number") {
        setMonthlyBudget(json.monthlyBudget);
        setBudgetInput(String(json.monthlyBudget));
      }
    } catch (e) {
      console.error("Failed to load hub data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, []);

  // Financial Calculations
  const financeStats = useMemo(() => {
    const totalExpense = finance
      .filter((f) => f.type === "expense")
      .reduce((acc, f) => acc + f.amount, 0);
    const pendingMustPay = finance
      .filter((f) => f.type === "must_pay" && f.status === "pending")
      .reduce((acc, f) => acc + f.amount, 0);
    const totalWantToBuy = finance
      .filter((f) => f.type === "want_to_buy" && f.status === "saved")
      .reduce((acc, f) => acc + f.amount, 0);
    const remainingBudget = monthlyBudget - totalExpense - pendingMustPay;

    // Group expenses by category
    const byCategory: Record<string, number> = {};
    finance
      .filter((f) => f.type === "expense")
      .forEach((f) => {
        byCategory[f.category] = (byCategory[f.category] || 0) + f.amount;
      });

    return {
      totalExpense,
      pendingMustPay,
      totalWantToBuy,
      remainingBudget,
      byCategory,
    };
  }, [finance, monthlyBudget]);

  // Actions: Budget
  const saveBudget = async () => {
    const num = Number(budgetInput) || 0;
    setMonthlyBudget(num);
    setEditingBudget(false);
    await fetch("/api/hub", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "budget", data: { monthlyBudget: num } }),
    });
  };

  // Actions: Finance
  const handleAddFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finTitle.trim()) return;
    await fetch("/api/hub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "finance",
        data: {
          title: finTitle.trim(),
          amount: Number(finAmount) || 0,
          type: finType,
          category: finCategory.trim() || "Umum",
          status: finType === "expense" ? "paid" : finType === "must_pay" ? "pending" : "saved",
          priority: finPriority,
          due_date: finDueDate || null,
          notes: finNotes.trim(),
        },
      }),
    });
    setFinTitle("");
    setFinAmount("");
    setFinNotes("");
    await fetchHubData();
  };

  const handleConvertFinanceToExpense = async (item: FinanceItem) => {
    await fetch("/api/hub", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "finance",
        id: item.id,
        data: { convertToExpense: true, type: item.type },
      }),
    });
    await fetchHubData();
  };

  const handleDeleteEntity = async (entity: "finance" | "task" | "note", id: number) => {
    await fetch(`/api/hub?entity=${entity}&id=${id}`, { method: "DELETE" });
    if (entity === "note" && selectedNoteId === id) {
      const remaining = notes.filter((n) => n.id !== id);
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
    }
    await fetchHubData();
  };

  // Actions: Tasks
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await fetch("/api/hub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "task",
        data: {
          title: taskTitle.trim(),
          details: taskDetails.trim(),
          list_name: taskListName.trim() || "Tugas Utama",
          due_date: taskDueDate || null,
          priority: taskPriority,
          completed: false,
          starred: false,
          subtasks: [],
        },
      }),
    });
    setTaskTitle("");
    setTaskDetails("");
    await fetchHubData();
  };

  const handleUpdateTask = async (task: TaskItem, updates: Partial<TaskItem>) => {
    const merged = { ...task, ...updates };
    await fetch("/api/hub", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "task", id: task.id, data: merged }),
    });
    await fetchHubData();
  };

  const handleAddSubtask = async (task: TaskItem) => {
    const text = (newSubtaskInputs[task.id] || "").trim();
    if (!text) return;
    const current: SubtaskItem[] = JSON.parse(task.subtasks || "[]");
    const updated = [...current, { id: `st-${Date.now()}`, title: text, done: false }];
    setNewSubtaskInputs((prev) => ({ ...prev, [task.id]: "" }));
    await handleUpdateTask(task, { subtasks: JSON.stringify(updated) });
  };

  const handleToggleSubtask = async (task: TaskItem, subtaskId: string) => {
    const current: SubtaskItem[] = JSON.parse(task.subtasks || "[]");
    const updated = current.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
    await handleUpdateTask(task, { subtasks: JSON.stringify(updated) });
  };

  // Actions: Notes
  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  const handleCreateNote = async (initialTitle = "Catatan Baru") => {
    const res = await fetch("/api/hub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "note",
        data: {
          title: initialTitle,
          icon: "📝",
          folder: selectedFolder === "ALL" ? "Workspace" : selectedFolder,
          content: `# ${initialTitle}\n\nMulai menulis catatan atau hubungkan dengan [[Panduan Personal Hub]]...\n`,
          tags: ["catatan"],
          pinned: false,
        },
      }),
    });
    const json = await res.json();
    await fetchHubData();
    if (json.id) {
      setSelectedNoteId(json.id);
      setActiveTab("notes");
    }
  };

  const handleUpdateNoteLocalAndSync = async (updates: Partial<NoteItem>) => {
    if (!selectedNote) return;
    const updatedNote = { ...selectedNote, ...updates };
    setNotes((prev) => prev.map((n) => (n.id === selectedNote.id ? updatedNote : n)));
    await fetch("/api/hub", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "note", id: selectedNote.id, data: updatedNote }),
    });
  };

  // Extract [[Wiki-Links]] and Backlinks (Obsidian style)
  const extractWikiLinks = (text: string): string[] => {
    const matches = text.matchAll(/\[\[([^\]]+)\]\]/g);
    return Array.from(matches, (m) => m[1].trim());
  };

  const backlinksForSelectedNote = useMemo(() => {
    if (!selectedNote) return [];
    const target = selectedNote.title.toLowerCase();
    return notes.filter(
      (n) =>
        n.id !== selectedNote.id &&
        extractWikiLinks(n.content).some((link) => link.toLowerCase() === target)
    );
  }, [notes, selectedNote]);

  // Obsidian Graph View Canvas Renderer
  useEffect(() => {
    if (activeTab !== "notes" || noteViewMode !== "graph" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.34;

    const nodePositions = notes.map((n, idx) => {
      const angle = (idx / Math.max(notes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return {
        note: n,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });

    // Draw edges for [[Wiki-Links]]
    ctx.lineWidth = 1.5;
    nodePositions.forEach((source) => {
      const links = extractWikiLinks(source.note.content);
      links.forEach((linkTitle) => {
        const target = nodePositions.find(
          (t) => t.note.title.toLowerCase() === linkTitle.toLowerCase()
        );
        if (target) {
          ctx.strokeStyle = "rgba(99, 102, 241, 0.55)";
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
      });
    });

    // Draw nodes
    nodePositions.forEach(({ note, x, y }) => {
      const isSelected = note.id === selectedNoteId;
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 22 : 16, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "#6366f1" : "#1e293b";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isSelected ? "#a5b4fc" : "#475569";
      ctx.stroke();

      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(note.icon || "📝", x, y);

      ctx.font = isSelected ? "bold 12px sans-serif" : "12px sans-serif";
      ctx.fillStyle = isSelected ? "#e0e7ff" : "#cbd5e1";
      ctx.fillText(note.title, x, y + 32);
    });
  }, [activeTab, noteViewMode, notes, selectedNoteId]);

  const handleOpenOrCreateWikiLink = async (title: string) => {
    const existing = notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
    if (existing) {
      setSelectedNoteId(existing.id);
      if (noteViewMode === "graph") setNoteViewMode("split");
    } else {
      await handleCreateNote(title);
    }
  };

  // Render Markdown with clickable [[Wiki-Links]] and interactive checklists
  const renderRichMarkdown = (markdown: string) => {
    const lines = markdown.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-2xl font-bold text-white mt-3 mb-2 border-b border-slate-800 pb-2">
            {line.slice(2)}
          </h1>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-lg font-semibold text-indigo-300 mt-4 mb-1.5">
            {line.slice(3)}
          </h2>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-base font-semibold text-slate-200 mt-3 mb-1">
            {line.slice(4)}
          </h3>
        );
      }
      if (line.startsWith("> ")) {
        return (
          <div
            key={idx}
            className="my-2 rounded-lg border-l-4 border-indigo-500 bg-indigo-950/30 px-4 py-2.5 text-sm text-indigo-200"
          >
            {line.slice(2)}
          </div>
        );
      }
      if (line.startsWith("- [ ] ") || line.startsWith("- [x] ")) {
        const checked = line.startsWith("- [x] ");
        const label = line.slice(6);
        return (
          <label
            key={idx}
            className="flex items-center gap-2.5 py-1 text-sm cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => {
                if (!selectedNote) return;
                const copy = [...lines];
                copy[idx] = checked ? `- [ ] ${label}` : `- [x] ${label}`;
                handleUpdateNoteLocalAndSync({ content: copy.join("\n") });
              }}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-500"
            />
            <span className={checked ? "line-through text-slate-500" : "text-slate-200"}>
              {label}
            </span>
          </label>
        );
      }

      // Parse [[Wiki-Links]] inside normal lines
      const parts = line.split(/(\[\[[^\]]+\]\])/g);
      return (
        <p key={idx} className="text-sm text-slate-300 leading-relaxed my-1 min-h-[1.25rem]">
          {parts.map((part, pIdx) => {
            if (part.startsWith("[[") && part.endsWith("]]")) {
              const targetTitle = part.slice(2, -2);
              const exists = notes.some(
                (n) => n.title.toLowerCase() === targetTitle.toLowerCase()
              );
              return (
                <button
                  key={pIdx}
                  onClick={() => handleOpenOrCreateWikiLink(targetTitle)}
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition ${
                    exists
                      ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30"
                      : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30"
                  }`}
                  title={exists ? `Buka catatan: ${targetTitle}` : `Buat catatan baru: ${targetTitle}`}
                >
                  <Link2 className="h-3 w-3" />
                  {targetTitle}
                </button>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </p>
      );
    });
  };

  const taskLists = useMemo(() => {
    const set = new Set<string>(["Tugas Utama", "Keuangan", "Proyek Game"]);
    tasks.forEach((t) => set.add(t.list_name));
    return Array.from(set);
  }, [tasks]);

  const noteFolders = useMemo(() => {
    const set = new Set<string>(["Workspace", "Keuangan", "Game Design", "Inbox"]);
    notes.forEach((n) => set.add(n.folder));
    return Array.from(set);
  }, [notes]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/90 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 px-2 py-3 mb-4">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white">Personal Hub</h1>
              <p className="text-xs text-slate-400">Finance • Tasks • Notes</p>
            </div>
          </div>

          {/* Global Search */}
          <div className="relative mb-5">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari transaksi, tugas, catatan..."
              className="w-full rounded-lg bg-slate-950/90 border border-slate-800 pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="h-4 w-4" />
                Ringkasan Hub
              </span>
            </button>

            <button
              onClick={() => setActiveTab("finance")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === "finance"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Wallet className="h-4 w-4" />
                Keuangan Pribadi
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {finance.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === "tasks"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <CheckSquare className="h-4 w-4" />
                Google Tasks
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {tasks.filter((t) => !t.completed).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("notes")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === "notes"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="h-4 w-4" />
                Notes (Notion/Obsidian)
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {notes.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Budget Status Footer */}
        <div className="mt-6 rounded-xl bg-slate-950/80 border border-slate-800 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Anggaran Bulanan</span>
            <button
              onClick={() => setEditingBudget(!editingBudget)}
              className="text-indigo-400 hover:underline"
            >
              {editingBudget ? "Batal" : "Ubah"}
            </button>
          </div>
          {editingBudget ? (
            <div className="flex gap-1.5 mt-1">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-white"
              />
              <button
                onClick={saveBudget}
                className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500"
              >
                OK
              </button>
            </div>
          ) : (
            <p className="text-sm font-bold text-white">{formatIDR(monthlyBudget)}</p>
          )}
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                financeStats.remainingBudget < 0 ? "bg-rose-500" : "bg-emerald-500"
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    ((financeStats.totalExpense + financeStats.pendingMustPay) /
                      Math.max(monthlyBudget, 1)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Sisa aman:{" "}
            <span
              className={
                financeStats.remainingBudget < 0
                  ? "text-rose-400 font-semibold"
                  : "text-emerald-400 font-semibold"
              }
            >
              {formatIDR(financeStats.remainingBudget)}
            </span>
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            Memuat database SQLite lokal...
          </div>
        ) : activeTab === "dashboard" ? (
          /* ================= DASHBOARD VIEW ================= */
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Ringkasan Personal Hub</h2>
                <p className="text-sm text-slate-400">
                  Pantau pengeluaran, daftar Must Paid & Want to Buy, Google Tasks, serta Catatan Anda.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("finance")}
                  className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-medium text-slate-200 flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Catat Keuangan
                </button>
                <button
                  onClick={() => handleCreateNote("Catatan Harian Baru")}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-medium text-white flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Catatan Baru
                </button>
              </div>
            </div>

            {/* 4 Financial Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Total Pengeluaran</span>
                  <Receipt className="h-4 w-4 text-rose-400" />
                </div>
                <p className="text-xl font-bold text-white">{formatIDR(financeStats.totalExpense)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {finance.filter((f) => f.type === "expense").length} transaksi tercatat
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/90 border border-amber-500/30 p-4">
                <div className="flex items-center justify-between text-xs text-amber-300 mb-2">
                  <span>Must Paid (Wajib Bayar)</span>
                  <CreditCard className="h-4 w-4 text-amber-400" />
                </div>
                <p className="text-xl font-bold text-amber-300">
                  {formatIDR(financeStats.pendingMustPay)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {finance.filter((f) => f.type === "must_pay" && f.status === "pending").length} tagihan belum lunas
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/90 border border-indigo-500/30 p-4">
                <div className="flex items-center justify-between text-xs text-indigo-300 mb-2">
                  <span>Want to Buy (Wishlist)</span>
                  <ShoppingBag className="h-4 w-4 text-indigo-400" />
                </div>
                <p className="text-xl font-bold text-indigo-300">
                  {formatIDR(financeStats.totalWantToBuy)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {finance.filter((f) => f.type === "want_to_buy" && f.status === "saved").length} barang diinginkan
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-4">
                <div className="flex items-center justify-between text-xs text-emerald-300 mb-2">
                  <span>Sisa Anggaran Aman</span>
                  <Wallet className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-xl font-bold text-emerald-400">
                  {formatIDR(financeStats.remainingBudget)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Setelah dikurangi Must Paid
                </p>
              </div>
            </div>

            {/* 3-Column Overview: Must Paid & Wishlist | Google Tasks | Pinned Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Must Paid Urgent List */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm text-amber-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> Tagihan Must Paid Aktif
                    </h3>
                    <button
                      onClick={() => {
                        setFinanceFilter("must_pay");
                        setActiveTab("finance");
                      }}
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-0.5"
                    >
                      Semua <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {finance
                      .filter((f) => f.type === "must_pay" && f.status === "pending")
                      .slice(0, 4)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3 flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-200">{item.title}</p>
                            <p className="text-xs text-slate-400">
                              {formatIDR(item.amount)} • Tenggat: {item.due_date || "-"}
                            </p>
                          </div>
                          <button
                            onClick={() => handleConvertFinanceToExpense(item)}
                            className="shrink-0 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-2.5 py-1.5 text-xs font-medium text-emerald-300 flex items-center gap-1"
                            title="Tandai lunas & otomatis catat ke Pengeluaran"
                          >
                            <Check className="h-3 w-3" /> Lunasi
                          </button>
                        </div>
                      ))}
                    {finance.filter((f) => f.type === "must_pay" && f.status === "pending")
                      .length === 0 && (
                      <p className="text-xs text-slate-500 py-4 text-center">
                        Semua tagihan wajib sudah lunas! 🎉
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Google Tasks Priority */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm text-indigo-300 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" /> Google Tasks Prioritas
                  </h3>
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    Buka Tasks <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {tasks
                    .filter((t) => !t.completed)
                    .slice(0, 5)
                    .map((task) => (
                      <div
                        key={task.id}
                        className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3 flex items-start gap-2.5"
                      >
                        <button
                          onClick={() => handleUpdateTask(task, { completed: 1 })}
                          className="mt-0.5 text-slate-400 hover:text-indigo-400"
                        >
                          <Circle className="h-4 w-4" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {task.list_name}
                            </span>
                            {task.due_date && <span>📅 {task.due_date}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Pinned Notes (Notion / Obsidian) */}
              <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm text-violet-300 flex items-center gap-2">
                    <Pin className="h-4 w-4" /> Catatan Penting (Notes)
                  </h3>
                  <button
                    onClick={() => setActiveTab("notes")}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    Buka Studio <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {notes.slice(0, 4).map((note) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        setSelectedNoteId(note.id);
                        setActiveTab("notes");
                      }}
                      className="w-full text-left rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-800/90 p-3 transition flex items-start gap-3"
                    >
                      <span className="text-xl">{note.icon || "📝"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-200 truncate">{note.title}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          Folder: {note.folder} • {extractWikiLinks(note.content).length} wiki-links
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "finance" ? (
          /* ================= KEUANGAN VIEW (PENGELUARAN, MUST PAID, WANT TO BUY) ================= */
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Manajemen Keuangan Pribadi</h2>
                <p className="text-sm text-slate-400">
                  Kelola daftar Pengeluaran harian, kewajiban Must Paid, dan wishlist Want to Buy.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {[
                  { id: "all", label: "Semua" },
                  { id: "expense", label: "💸 Pengeluaran" },
                  { id: "must_pay", label: "⚠️ Must Paid" },
                  { id: "want_to_buy", label: "🛍️ Want to Buy" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFinanceFilter(tab.id as FinanceFilter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      financeFilter === tab.id
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Add Finance Form */}
            <form
              onSubmit={handleAddFinance}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
            >
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">Nama Item / Transaksi</label>
                <input
                  type="text"
                  required
                  value={finTitle}
                  onChange={(e) => setFinTitle(e.target.value)}
                  placeholder="Contoh: Bayar Listrik / Beli Sepatu..."
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  required
                  value={finAmount}
                  onChange={(e) => setFinAmount(e.target.value)}
                  placeholder="150000"
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tipe Daftar</label>
                <select
                  value={finType}
                  onChange={(e) => setFinType(e.target.value as any)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
                >
                  <option value="expense">💸 Pengeluaran</option>
                  <option value="must_pay">⚠️ Must Paid (Wajib)</option>
                  <option value="want_to_buy">🛍️ Want to Buy (Wishlist)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Kategori & Prioritas</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={finCategory}
                    onChange={(e) => setFinCategory(e.target.value)}
                    placeholder="Kategori"
                    className="w-1/2 rounded-lg bg-slate-950 border border-slate-800 px-2 py-2 text-xs text-white"
                  />
                  <select
                    value={finPriority}
                    onChange={(e) => setFinPriority(e.target.value as any)}
                    className="w-1/2 rounded-lg bg-slate-950 border border-slate-800 px-2 py-2 text-xs text-white"
                  >
                    <option value="high">Tinggi</option>
                    <option value="medium">Sedang</option>
                    <option value="low">Rendah</option>
                  </select>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] text-slate-400 mb-1">Target / Tenggat</label>
                  <input
                    type="date"
                    value={finDueDate}
                    onChange={(e) => setFinDueDate(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-2 text-xs text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white flex items-center gap-1 shrink-0"
                >
                  <Plus className="h-4 w-4" /> Tambah
                </button>
              </div>
            </form>

            {/* 3 Columns or Filtered List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Column 1: Pengeluaran */}
              {(financeFilter === "all" || financeFilter === "expense") && (
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <h3 className="font-semibold text-sm text-rose-300 flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> Daftar Pengeluaran
                    </h3>
                    <span className="text-xs font-bold text-rose-400">
                      {formatIDR(financeStats.totalExpense)}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {finance
                      .filter(
                        (f) =>
                          f.type === "expense" &&
                          f.title.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-3 flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-200">{item.title}</p>
                            <p className="text-xs text-slate-400">
                              <span className="text-rose-400 font-semibold">
                                {formatIDR(item.amount)}
                              </span>{" "}
                              • {item.category} {item.due_date ? `• ${item.due_date}` : ""}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteEntity("finance", item.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Column 2: Must Paid */}
              {(financeFilter === "all" || financeFilter === "must_pay") && (
                <div className="rounded-2xl bg-slate-900/80 border border-amber-500/25 p-4 flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <h3 className="font-semibold text-sm text-amber-300 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Daftar Must Paid (Wajib)
                    </h3>
                    <span className="text-xs font-bold text-amber-300">
                      {formatIDR(financeStats.pendingMustPay)}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {finance
                      .filter(
                        (f) =>
                          f.type === "must_pay" &&
                          f.title.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-3 flex items-center justify-between gap-2 ${
                            item.status === "paid"
                              ? "bg-slate-950/40 border-slate-800/50 opacity-60"
                              : "bg-slate-950/80 border-amber-500/30"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p
                                className={`text-sm font-medium ${
                                  item.status === "paid"
                                    ? "line-through text-slate-400"
                                    : "text-slate-100"
                                }`}
                              >
                                {item.title}
                              </p>
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              <span className="text-amber-300 font-semibold">
                                {formatIDR(item.amount)}
                              </span>{" "}
                              • Jatuh tempo: {item.due_date || "-"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.status === "pending" && (
                              <button
                                onClick={() => handleConvertFinanceToExpense(item)}
                                className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-300"
                                title="Tandai Lunas & Catat ke Pengeluaran"
                              >
                                Lunasi
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEntity("finance", item.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Column 3: Want to Buy */}
              {(financeFilter === "all" || financeFilter === "want_to_buy") && (
                <div className="rounded-2xl bg-slate-900/80 border border-indigo-500/25 p-4 flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <h3 className="font-semibold text-sm text-indigo-300 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" /> Daftar Want to Buy (Wishlist)
                    </h3>
                    <span className="text-xs font-bold text-indigo-300">
                      {formatIDR(financeStats.totalWantToBuy)}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {finance
                      .filter(
                        (f) =>
                          f.type === "want_to_buy" &&
                          f.title.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-3 flex items-center justify-between gap-2 ${
                            item.status === "bought"
                              ? "bg-slate-950/40 border-slate-800/50 opacity-60"
                              : "bg-slate-950/80 border-indigo-500/30"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p
                                className={`text-sm font-medium ${
                                  item.status === "bought"
                                    ? "line-through text-slate-400"
                                    : "text-slate-100"
                                }`}
                              >
                                {item.title}
                              </p>
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                                {item.priority}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              <span className="text-indigo-300 font-semibold">
                                {formatIDR(item.amount)}
                              </span>{" "}
                              • Target: {item.due_date || "Fleksibel"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.status === "saved" && (
                              <button
                                onClick={() => handleConvertFinanceToExpense(item)}
                                className="rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 px-2.5 py-1 text-xs font-medium text-indigo-300"
                                title="Tandai Sudah Dibeli & Catat ke Pengeluaran"
                              >
                                Beli
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEntity("finance", item.id)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "tasks" ? (
          /* ================= GOOGLE TASKS VIEW ================= */
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Penjadwalan & Google Tasks</h2>
                <p className="text-sm text-slate-400">
                  Kelola daftar tugas harian, sub-tugas (checklist), bintang prioritas, dan tenggat waktu.
                </p>
              </div>

              {/* List Switcher */}
              <div className="flex flex-wrap gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setSelectedTaskList("ALL")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedTaskList === "ALL"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Semua Tugas
                </button>
                <button
                  onClick={() => setSelectedTaskList("STARRED")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedTaskList === "STARRED"
                      ? "bg-amber-500 text-slate-950 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  ⭐ Berbintang
                </button>
                {taskLists.map((list) => (
                  <button
                    key={list}
                    onClick={() => setSelectedTaskList(list)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      selectedTaskList === list
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {list}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Add Task Bar */}
            <form
              onSubmit={handleAddTask}
              className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-6 gap-3"
            >
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="+ Tambahkan tugas baru (seperti Google Tasks)..."
                className="sm:col-span-2 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                value={taskDetails}
                onChange={(e) => setTaskDetails(e.target.value)}
                placeholder="Rincian / catatan tugas..."
                className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                value={taskListName}
                onChange={(e) => setTaskListName(e.target.value)}
                placeholder="Nama List (mis. Keuangan)"
                className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
              />
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Buat Tugas
              </button>
            </form>

            {/* Task Cards */}
            <div className="space-y-3">
              {tasks
                .filter((t) => {
                  if (selectedTaskList === "STARRED" && !t.starred) return false;
                  if (
                    selectedTaskList !== "ALL" &&
                    selectedTaskList !== "STARRED" &&
                    t.list_name !== selectedTaskList
                  )
                    return false;
                  return t.title.toLowerCase().includes(searchQuery.toLowerCase());
                })
                .map((task) => {
                  const subtasks: SubtaskItem[] = JSON.parse(task.subtasks || "[]");
                  return (
                    <div
                      key={task.id}
                      className={`rounded-2xl border p-4 transition ${
                        task.completed
                          ? "bg-slate-900/40 border-slate-800/50 opacity-65"
                          : "bg-slate-900/90 border-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <button
                            onClick={() =>
                              handleUpdateTask(task, { completed: task.completed ? 0 : 1 })
                            }
                            className="mt-0.5 text-indigo-400 hover:text-indigo-300"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            ) : (
                              <Circle className="h-5 w-5" />
                            )}
                          </button>
                          <div className="flex-1">
                            <p
                              className={`text-sm font-semibold ${
                                task.completed ? "line-through text-slate-400" : "text-white"
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.details && (
                              <p className="text-xs text-slate-400 mt-0.5">{task.details}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300">
                                {task.list_name}
                              </span>
                              {task.due_date && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> {task.due_date}
                                </span>
                              )}
                            </div>

                            {/* Subtasks (Google Tasks style) */}
                            <div className="mt-3 pl-2 border-l-2 border-slate-800 space-y-1.5">
                              {subtasks.map((st) => (
                                <label
                                  key={st.id}
                                  className="flex items-center gap-2 text-xs cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={st.done}
                                    onChange={() => handleToggleSubtask(task, st.id)}
                                    className="rounded border-slate-700 bg-slate-900 text-indigo-500"
                                  />
                                  <span
                                    className={
                                      st.done ? "line-through text-slate-500" : "text-slate-300"
                                    }
                                  >
                                    {st.title}
                                  </span>
                                </label>
                              ))}
                              <div className="flex items-center gap-1.5 pt-1">
                                <input
                                  type="text"
                                  value={newSubtaskInputs[task.id] || ""}
                                  onChange={(e) =>
                                    setNewSubtaskInputs((prev) => ({
                                      ...prev,
                                      [task.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddSubtask(task);
                                    }
                                  }}
                                  placeholder="+ Sub-tugas..."
                                  className="rounded bg-slate-950 border border-slate-800 px-2 py-1 text-[11px] text-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddSubtask(task)}
                                  className="text-[11px] text-indigo-400 hover:underline"
                                >
                                  Tambah
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              handleUpdateTask(task, { starred: task.starred ? 0 : 1 })
                            }
                            className={`p-1.5 rounded-lg ${
                              task.starred
                                ? "text-amber-400 bg-amber-500/10"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            <Star className="h-4 w-4 fill-current" />
                          </button>
                          <button
                            onClick={() => handleDeleteEntity("task", task.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          /* ================= NOTES STUDIO (NOTION + OBSIDIAN HYBRID) ================= */
          <div className="h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-5">
            {/* Left Note Explorer */}
            <div className="w-full lg:w-72 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-indigo-400" /> Vault Catatan
                </h3>
                <button
                  onClick={() => handleCreateNote("Halaman Baru")}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 text-xs font-medium text-white flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Baru
                </button>
              </div>

              {/* Folder Filter */}
              <div className="flex flex-wrap gap-1 mb-3">
                <button
                  onClick={() => setSelectedFolder("ALL")}
                  className={`px-2 py-1 rounded text-[11px] ${
                    selectedFolder === "ALL"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950 text-slate-400"
                  }`}
                >
                  Semua
                </button>
                {noteFolders.map((folder) => (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    className={`px-2 py-1 rounded text-[11px] ${
                      selectedFolder === folder
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-950 text-slate-400"
                    }`}
                  >
                    {folder}
                  </button>
                ))}
              </div>

              {/* Notes List */}
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {notes
                  .filter(
                    (n) =>
                      (selectedFolder === "ALL" || n.folder === selectedFolder) &&
                      (n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        n.content.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={`w-full text-left rounded-xl p-2.5 transition flex items-start justify-between gap-2 ${
                        selectedNoteId === note.id
                          ? "bg-indigo-600/20 border border-indigo-500/40 text-white"
                          : "hover:bg-slate-800/60 text-slate-300 border border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="text-lg">{note.icon || "📝"}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{note.title}</p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {note.folder}
                          </p>
                        </div>
                      </div>
                      {note.pinned ? <Pin className="h-3 w-3 text-amber-400 shrink-0" /> : null}
                    </button>
                  ))}
              </div>
            </div>

            {/* Right Note Workspace */}
            <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col overflow-hidden">
              {selectedNote ? (
                <>
                  {/* Top Bar: Notion Properties & Obsidian Mode Switcher */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                      {/* Emoji Selector */}
                      <select
                        value={selectedNote.icon}
                        onChange={(e) => handleUpdateNoteLocalAndSync({ icon: e.target.value })}
                        className="rounded-lg bg-slate-950 border border-slate-800 px-2 py-1.5 text-lg cursor-pointer"
                      >
                        {EMOJI_OPTIONS.map((em) => (
                          <option key={em} value={em}>
                            {em}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={selectedNote.title}
                        onChange={(e) => handleUpdateNoteLocalAndSync({ title: e.target.value })}
                        className="flex-1 bg-transparent text-xl font-bold text-white focus:outline-none border-b border-transparent focus:border-indigo-500"
                      />
                    </div>

                    {/* View Mode Buttons */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setNoteViewMode("split")}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 ${
                          noteViewMode === "split"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Columns className="h-3.5 w-3.5" /> Split
                      </button>
                      <button
                        onClick={() => setNoteViewMode("edit")}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 ${
                          noteViewMode === "edit"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Editor
                      </button>
                      <button
                        onClick={() => setNoteViewMode("preview")}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 ${
                          noteViewMode === "preview"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" /> Baca
                      </button>
                      <button
                        onClick={() => setNoteViewMode("graph")}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 ${
                          noteViewMode === "graph"
                            ? "bg-violet-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Network className="h-3.5 w-3.5" /> Graph View
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          handleUpdateNoteLocalAndSync({ pinned: selectedNote.pinned ? 0 : 1 })
                        }
                        className={`p-2 rounded-lg border ${
                          selectedNote.pinned
                            ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                            : "border-slate-800 text-slate-400 hover:text-white"
                        }`}
                        title="Pin halaman ini"
                      >
                        <Pin className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEntity("note", selectedNote.id)}
                        className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400"
                        title="Hapus halaman"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notion Block Quick Insert Toolbar & Tags */}
                  <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 border-b border-slate-800/80 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-500 mr-1">Blok Cepat:</span>
                      {[
                        { label: "H2", snippet: "\n## Subjudul Baru\n" },
                        { label: "Checklist", snippet: "\n- [ ] Item baru" },
                        { label: "Callout 💡", snippet: "\n> 💡 Catatan penting di sini" },
                        {
                          label: "[[WikiLink]]",
                          snippet: ` [[${notes[0]?.title || "Catatan"}]] `,
                        },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          onClick={() =>
                            handleUpdateNoteLocalAndSync({
                              content: selectedNote.content + btn.snippet,
                            })
                          }
                          className="rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 px-2 py-1 text-[11px] text-slate-300"
                        >
                          + {btn.label}
                        </button>
                      ))}
                    </div>

                    {/* Folder & Tags */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={selectedNote.folder}
                        onChange={(e) => handleUpdateNoteLocalAndSync({ folder: e.target.value })}
                        className="rounded bg-slate-950 border border-slate-800 px-2 py-1 text-[11px] text-indigo-300 w-28"
                        placeholder="Folder"
                      />
                    </div>
                  </div>

                  {/* Editor / Preview / Obsidian Graph Body */}
                  {noteViewMode === "graph" ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/70 rounded-xl mt-3 p-4 border border-slate-800">
                      <div className="flex items-center justify-between w-full mb-2">
                        <p className="text-xs text-slate-400">
                          <strong className="text-indigo-300">Obsidian Graph View:</strong> Menunjukkan koneksi{" "}
                          <code>[[Wiki-Links]]</code> antar catatan di Vault Anda.
                        </p>
                      </div>
                      <canvas
                        ref={canvasRef}
                        width={680}
                        height={380}
                        className="max-w-full rounded-lg bg-slate-950 border border-slate-900"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3 overflow-hidden">
                      {(noteViewMode === "split" || noteViewMode === "edit") && (
                        <textarea
                          value={selectedNote.content}
                          onChange={(e) =>
                            handleUpdateNoteLocalAndSync({ content: e.target.value })
                          }
                          placeholder="Tulis dengan Markdown atau ketik [[Judul Catatan]] untuk membuat tautan ala Obsidian..."
                          className={`w-full h-full rounded-xl bg-slate-950/90 border border-slate-800 p-4 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-none ${
                            noteViewMode === "edit" ? "lg:col-span-2" : ""
                          }`}
                        />
                      )}

                      {(noteViewMode === "split" || noteViewMode === "preview") && (
                        <div
                          className={`h-full overflow-y-auto rounded-xl bg-slate-950/50 border border-slate-800/80 p-5 flex flex-col justify-between ${
                            noteViewMode === "preview" ? "lg:col-span-2" : ""
                          }`}
                        >
                          <div>{renderRichMarkdown(selectedNote.content)}</div>

                          {/* Obsidian Backlinks Footer */}
                          <div className="mt-8 pt-4 border-t border-slate-800/80">
                            <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
                              <Link2 className="h-3.5 w-3.5 text-indigo-400" />
                              Backlinks (Catatan yang menautkan ke halaman ini:{" "}
                              {backlinksForSelectedNote.length})
                            </p>
                            {backlinksForSelectedNote.length === 0 ? (
                              <p className="text-[11px] text-slate-500">
                                Belum ada catatan lain yang menulis{" "}
                                <code>[[{selectedNote.title}]]</code>.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {backlinksForSelectedNote.map((bl) => (
                                  <button
                                    key={bl.id}
                                    onClick={() => setSelectedNoteId(bl.id)}
                                    className="rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs text-indigo-300 flex items-center gap-1.5"
                                  >
                                    <span>{bl.icon}</span>
                                    <span>{bl.title}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
                  Pilih catatan di sebelah kiri atau buat catatan baru.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
