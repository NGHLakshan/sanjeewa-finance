import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { subscribeToTransactions } from "../services/transactions";
import { subscribeToCategories, addCategory, updateCategory, deleteCategory } from "../services/categories";
import { TrendingUp, TrendingDown, Wallet, Calendar, Filter, PlusCircle, Building2, X, Settings2, Check, Trash2, ChevronLeft, ChevronRight, ArrowLeft, Layers, Pencil, Clock, CreditCard, Banknote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";
import CategoryManagerModal from "./CategoryManagerModal";
import EditTransactionModal from "./EditTransactionModal";
import { registerModal } from "../utils/modalHistory";

const ScrollResetContainer = ({ children, className }) => {
  const ref = useRef(null);
  // Force scroll top on mount
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = 0;
    }
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};


const formatCurrency = (n) =>
  `Rs. ${Number(n).toLocaleString("en-LK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

const formatTransactionTime = (timeStr, createdAt) => {
  if (timeStr && typeof timeStr === "string" && timeStr.trim()) {
    const trimmed = timeStr.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const existingAmpm = match[3];
      if (existingAmpm) {
        return `${hours}:${minutes} ${existingAmpm.toUpperCase()}`;
      }
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    }
    return trimmed;
  }
  if (createdAt) {
    try {
      const d = createdAt.toDate ? createdAt.toDate() : new Date(createdAt.seconds ? createdAt.seconds * 1000 : createdAt);
      if (!isNaN(d.getTime())) {
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
};

const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      label: d.toLocaleString("default", { month: "long", year: "numeric" }),
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    });
  }
  return options;
};

const toMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const renderPaymentBadge = (method) => {
  if (method === "Cash") {
    return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shrink-0">💵 Cash</span>;
  }
  if (method === "Credit Card") {
    return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-purple-500/15 text-purple-400 border-purple-500/30 shrink-0">💳 Card</span>;
  }
  if (method === "Debit Card") {
    return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-amber-500/15 text-amber-400 border-amber-500/30 shrink-0">💳 Debit</span>;
  }
  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-sky-500/15 text-sky-400 border-sky-500/30 shrink-0">🏦 Bank</span>;
};

// ── Date-grouped transaction list renderer with Page-by-Page Pagination ──────
// Displays transactions in pages of 10 items. Groups the page's transactions by calendar
// date with date headers + daily net. When Next/Prev/Page # is clicked, previous transactions
// are hidden and the selected page is shown.
const DateGroupedTxList = ({
  txList,
  pageSize = 10,
  limit,
  onMore,
  onEdit,
  emptyLabel = "No transactions found."
}) => {
  const [page, setPage] = useState(1);
  const containerRef = useRef(null);

  // Reset to first page when source list changes
  useEffect(() => {
    setPage(1);
  }, [txList]);

  if (!txList || txList.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-slate-500 text-sm">{emptyLabel}</div>
    );
  }

  const effectivePageSize = 10;
  const totalPages = Math.ceil(txList.length / effectivePageSize) || 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startIndex = (currentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, txList.length);
  const visible = txList.slice(startIndex, endIndex);

  // Bucket visible txns by ISO date key, preserving newest-first order
  const buckets = {};
  const order = [];
  visible.forEach((t) => {
    const d = t.date instanceof Date ? t.date : new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!buckets[key]) {
      buckets[key] = { date: d, txns: [] };
      order.push(key);
    }
    buckets[key].txns.push(t);
  });

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Helper for generating page numbers (1, 2, 3...)
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, "...", totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {order.map((key) => {
        const { date, txns } = buckets[key];
        const dayName = DAY_NAMES[date.getDay()];
        const dateLabel = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        const dayNet = txns.reduce((s, t) => s + (t.type === "Income" ? Number(t.amount) : -Number(t.amount)), 0);
        return (
          <div key={key}>
            {/* Date header row */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{dayName}</span>
                <span className="text-[10px] text-slate-500 font-medium">• {dateLabel}</span>
              </div>
              <span className={`text-[10px] font-bold font-mono ${dayNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {dayNet >= 0 ? "+" : "−"} Rs. {Number(Math.abs(dayNet)).toLocaleString("en-LK")}
              </span>
            </div>
            {/* Transaction rows for this date */}
            <div className="space-y-2">
              {txns.map((t) => {
                const isIncome = t.type === "Income";
                const txTime = formatTransactionTime(t.time, t.createdAt);
                return (
                  <div
                    key={t.id}
                    onClick={() => onEdit(t)}
                    className="glass-card p-3.5 flex items-center gap-3 hover:bg-slate-900/80 transition-colors border border-slate-800/80 cursor-pointer group"
                    title="Click to edit or delete"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${isIncome ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                      {isIncome ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-bold text-sm truncate max-w-[200px] sm:max-w-xs">
                          {t.subCategory || t.category || "General"}
                        </p>
                        {t.description && <span className="text-[11px] text-slate-400 truncate max-w-[140px]">• {t.description}</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                        {renderPaymentBadge(t.paymentMethod)}
                        {txTime && (<><span className="text-slate-600">•</span><span className="font-mono text-slate-300 text-[11px] whitespace-nowrap flex items-center gap-1"><Clock size={11} className="text-slate-400 shrink-0"/>{txTime}</span></>)}
                      </div>
                      {t.description && (
                        <p className="text-[11px] text-slate-400 mt-1 flex items-start gap-1">
                          <span className="text-slate-600 shrink-0">"</span>
                          <span className="truncate italic text-slate-300">{t.description}</span>
                          <span className="text-slate-600 shrink-0">"</span>
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className={`text-sm font-bold font-mono whitespace-nowrap ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
                        {isIncome ? "+" : "−"} Rs. {Number(t.amount).toLocaleString("en-LK")}
                      </span>
                      <div className="p-1.5 rounded-lg text-slate-500 group-hover:text-slate-300 transition-colors"><Pencil size={13}/></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Page-by-Page Pagination Controls ── */}
      {totalPages > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          <div className="text-[11px] text-slate-400 font-medium">
            Showing <span className="text-slate-200 font-mono font-bold">{startIndex + 1}</span>–<span className="text-slate-200 font-mono font-bold">{endIndex}</span> of <span className="text-slate-200 font-mono font-bold">{txList.length}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {/* Previous Button */}
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                currentPage === 1
                  ? "border-slate-800/60 bg-slate-900/40 text-slate-600 cursor-not-allowed"
                  : "border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white hover:border-emerald-500/50 shadow-sm cursor-pointer"
              }`}
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((item, idx) => {
                if (item === "...") {
                  return (
                    <span key={`dots-${idx}`} className="px-1.5 py-1 text-slate-500 text-xs font-mono select-none">
                      ...
                    </span>
                  );
                }
                const isActive = item === currentPage;
                return (
                  <button
                    key={`page-${item}`}
                    type="button"
                    onClick={() => handlePageChange(item)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center border ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all ${
                currentPage === totalPages
                  ? "border-slate-800/60 bg-slate-900/40 text-slate-600 cursor-not-allowed"
                  : "border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white hover:border-emerald-500/50 shadow-sm cursor-pointer"
              }`}
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function Dashboard({ onNewEntry, transactions: propTransactions, initialTransactions = [] }) {
  const [localTransactions, setLocalTransactions] = useState(initialTransactions);
  const transactions = propTransactions !== undefined ? propTransactions : localTransactions;
  const [loading, setLoading] = useState(() => (propTransactions ? false : initialTransactions.length === 0));
  const [selectedMonth, setSelectedMonth] = useState(() => toMonthKey(new Date()));
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [categories, setCategories] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [managingCategory, setManagingCategory] = useState(null);
  const [expandedCatId, setExpandedCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [renamingCatId, setRenamingCatId] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [viewingCategory, setViewingCategory] = useState(null);
  const [selectedSubCategoryFilter, setSelectedSubCategoryFilter] = useState(null);
  const [showNetCategoryModal, setShowNetCategoryModal] = useState(false);
  const [selectedNetCategory, setSelectedNetCategory] = useState(null);
  const [selectedNetSubFilter, setSelectedNetSubFilter] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [visibleTxLimit, setVisibleTxLimit] = useState(10);
  const [netModalTxLimit, setNetModalTxLimit] = useState(10);
  const [pmCatFilter, setPmCatFilter] = useState(null);

  // No scroll refs needed — each modal uses a separate inner overflow-y-auto div
  // that is always a fresh DOM element, so scrollTop is always 0 on open.

  // Sync initialTransactions from parent when available if not using propTransactions
  useEffect(() => {
    if (propTransactions === undefined && initialTransactions.length > 0 && localTransactions.length === 0) {
      setLocalTransactions(initialTransactions);
      setLoading(false);
    }
  }, [initialTransactions, propTransactions]);

  useEffect(() => {
    if (propTransactions !== undefined) {
      setLoading(false);
      return;
    }
    const unsubTx = subscribeToTransactions((data) => {
      setLocalTransactions(data);
      setLoading(false);
    });
    return () => unsubTx();
  }, [propTransactions]);

  useEffect(() => {
    const unsubCat = subscribeToCategories((data) => {
      setCategories(data);
    });
    return () => unsubCat();
  }, []);

  // Register modals with modalHistory so the back button closes the topmost open modal
  useEffect(() => {
    if (viewingCategory) {
      return registerModal(() => {
        setViewingCategory(null);
        setSelectedSubCategoryFilter(null);
        setVisibleTxLimit(10);
      });
    }
  }, [viewingCategory]);

  useEffect(() => {
    if (selectedNetCategory) {
      return registerModal(() => {
        setSelectedNetCategory(null);
        setSelectedNetSubFilter(null);
      });
    }
  }, [selectedNetCategory]);

  useEffect(() => {
    if (showNetCategoryModal && !selectedNetCategory) {
      return registerModal(() => {
        setShowNetCategoryModal(false);
      });
    }
  }, [showNetCategoryModal, selectedNetCategory]);

  useEffect(() => {
    setPmCatFilter(null);
    setVisibleTxLimit(10);
  }, [selectedMethod]);

  useEffect(() => {
    if (selectedMethod) {
      return registerModal(() => setSelectedMethod(null));
    }
  }, [selectedMethod]);

  useEffect(() => {
    if (editingTransaction) {
      return registerModal(() => setEditingTransaction(null));
    }
  }, [editingTransaction]);

  useEffect(() => {
    if (managingCategory) {
      return registerModal(() => setManagingCategory(null));
    }
  }, [managingCategory]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      return (
        toMonthKey(t.date) === selectedMonth &&
        (categoryFilter === "All" || t.category === categoryFilter)
      );
    });
  }, [transactions, selectedMonth, categoryFilter]);

  // Sort by date+time descending (latest first)
  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const pad = (n) => String(n).padStart(2, '0');
      const strA = `${a.date.getFullYear()}-${pad(a.date.getMonth() + 1)}-${pad(a.date.getDate())}T${a.time || '00:00'}`;
      const strB = `${b.date.getFullYear()}-${pad(b.date.getMonth() + 1)}-${pad(b.date.getDate())}T${b.time || '00:00'}`;
      return new Date(strB) - new Date(strA);
    });
  }, [filtered]);

  const { totalIncome, totalExpense, cashBalance, bankBalance, creditCardSpent, debitCardSpent } = useMemo(() => {
    let inc = 0, exp = 0;
    let cash = 0, bank = 0, creditCard = 0, debitCard = 0;
    filtered.forEach(t => {
      const amount = Number(t.amount) || 0;
      const method = t.paymentMethod || "Cash";
      const isCash = method === "Cash";
      const isBank = method === "Bank" || method === "Bank Transfer";
      const isCreditCard = method === "Credit Card";
      const isDebitCard = method === "Debit Card";

      if (t.type === "Income") {
        inc += amount;
        if (isCash) cash += amount;
        if (isBank) bank += amount;
      } else {
        exp += amount;
        if (isCash) cash -= amount;
        if (isBank) bank -= amount;
        if (isCreditCard) creditCard += amount;
        if (isDebitCard) debitCard += amount;
      }
    });
    return { 
      totalIncome: inc, 
      totalExpense: exp, 
      cashBalance: cash, 
      bankBalance: bank, 
      creditCardSpent: creditCard,
      debitCardSpent: debitCard
    };
  }, [filtered]);

  const netProfit = totalIncome - totalExpense;
  const isProfitable = netProfit >= 0;

  // Chart Data
  const chartData = [
    { name: 'Income', value: totalIncome, color: '#10b981' },
    { name: 'Expenses', value: totalExpense, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const cashBankData = [
    { name: 'Cash', value: Math.max(0, cashBalance), actual: cashBalance, color: '#10b981' }, // Emerald Green
    { name: 'Bank', value: Math.max(0, bankBalance), actual: bankBalance, color: '#0ea5e9' }, // Sky Blue
  ].filter(d => d.value > 0);

  const modalData = useMemo(() => {
    if (!selectedMethod) return null;
    const methodTx = filtered.filter(t => {
      if (selectedMethod === "Credit Card") return t.paymentMethod === "Credit Card";
      if (selectedMethod === "Debit Card") return t.paymentMethod === "Debit Card";
      if (selectedMethod === "Cash") return t.paymentMethod === "Cash";
      if (selectedMethod === "Bank Transfer" || selectedMethod === "Bank") {
        return t.paymentMethod === "Bank" || t.paymentMethod === "Bank Transfer";
      }
      return t.paymentMethod === selectedMethod;
    });
    let inc = 0, exp = 0;
    const categoryTotals = {};

    methodTx.forEach(t => {
      const amount = Number(t.amount) || 0;
      if (t.type === "Income") inc += amount;
      else exp += amount;

      if (!categoryTotals[t.category]) categoryTotals[t.category] = { income: 0, expense: 0, count: 0 };
      categoryTotals[t.category].count += 1;
      if (t.type === "Income") categoryTotals[t.category].income += amount;
      else categoryTotals[t.category].expense += amount;
    });

    const mChartData = [
      { name: 'Income', value: inc, color: '#10b981' },
      { name: 'Expenses', value: exp, color: '#ef4444' },
    ].filter(d => d.value > 0);

    // Include ALL Firestore categories, enriched with transaction data (or zeros)
    const breakdown = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      incomeTypes: cat.incomeTypes || [],
      expenseTypes: cat.expenseTypes || [],
      income: categoryTotals[cat.name]?.income || 0,
      expense: categoryTotals[cat.name]?.expense || 0,
      count: categoryTotals[cat.name]?.count || 0,
    }));

    const totalDisplay = selectedMethod === "Cash" 
      ? cashBalance 
      : (selectedMethod === "Bank" || selectedMethod === "Bank Transfer")
      ? bankBalance
      : selectedMethod === "Credit Card"
      ? creditCardSpent
      : debitCardSpent;

    const sortedMethodTx = [...methodTx].sort((a, b) => {
      const pad = n => String(n).padStart(2, '0');
      const strA = `${a.date.getFullYear()}-${pad(a.date.getMonth()+1)}-${pad(a.date.getDate())}T${a.time||'00:00'}`;
      const strB = `${b.date.getFullYear()}-${pad(b.date.getMonth()+1)}-${pad(b.date.getDate())}T${b.time||'00:00'}`;
      return new Date(strB) - new Date(strA);
    });
    return {
      chartData: mChartData,
      breakdown,
      totalIncome: inc,
      totalExpense: exp,
      total: totalDisplay,
      transactions: sortedMethodTx,
    };
  }, [selectedMethod, filtered, cashBalance, bankBalance, creditCardSpent, debitCardSpent, categories]);
  const categoryDetailsData = useMemo(() => {
    if (!viewingCategory) return null;
    
    // 1. Filter transactions for this category (and payment method if opened from Cash/Bank modal)
    const catTx = filtered.filter(t =>
      t.category === viewingCategory &&
      (selectedMethod ? t.paymentMethod === selectedMethod : true)
    );
    
    // 2. Aggregate by subCategory
    const incomeAgg = {};
    const expenseAgg = {};
    let totalInc = 0;
    let totalExp = 0;

    catTx.forEach(t => {
      const amount = Number(t.amount) || 0;
      const sub = t.subCategory || "Unknown";
      if (t.type === "Income") {
        totalInc += amount;
        incomeAgg[sub] = (incomeAgg[sub] || 0) + amount;
      } else {
        totalExp += amount;
        expenseAgg[sub] = (expenseAgg[sub] || 0) + amount;
      }
    });

    const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#a855f7', '#d946ef', '#f43f5e', '#8b5cf6', '#ec4899', '#ea580c'];
    const INCOME_COLORS = ['#10b981', '#34d399', '#059669', '#6ee7b7', '#047857', '#0f766e', '#14b8a6', '#2dd4bf'];

    const incomeChart = Object.keys(incomeAgg).map((key, index) => ({
      name: key,
      value: incomeAgg[key],
      color: INCOME_COLORS[index % INCOME_COLORS.length]
    })).sort((a, b) => b.value - a.value);

    const expenseChart = Object.keys(expenseAgg).map((key, index) => ({
      name: key,
      value: expenseAgg[key],
      color: EXPENSE_COLORS[index % EXPENSE_COLORS.length]
    })).sort((a, b) => b.value - a.value);

    return {
      transactions: catTx,
      incomeChart,
      expenseChart,
      totalIncome: totalInc,
      totalExpense: totalExp,
    };
  }, [viewingCategory, filtered, selectedMethod]);

  // All transactions for the selected month regardless of active dashboard payment/category filters
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => toMonthKey(t.date) === selectedMonth);
  }, [transactions, selectedMonth]);

  // All transactions for the selected month sorted by Date and Time descending (latest first)
  const sortedMonthTransactions = useMemo(() => {
    return [...monthTransactions].sort((a, b) => {
      const pad = (n) => String(n).padStart(2, '0');
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      const strA = `${da.getFullYear()}-${pad(da.getMonth() + 1)}-${pad(da.getDate())}T${a.time || '00:00'}`;
      const strB = `${db.getFullYear()}-${pad(db.getMonth() + 1)}-${pad(db.getDate())}T${b.time || '00:00'}`;
      return new Date(strB) - new Date(strA);
    });
  }, [monthTransactions]);

  // Combined Cash + Bank + Cards category breakdown for all added categories
  const allCategoriesBreakdown = useMemo(() => {
    const categoryTotals = {};
    monthTransactions.forEach((t) => {
      const amount = Number(t.amount) || 0;
      const catName = t.category || "Uncategorized";
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = {
          income: 0,
          expense: 0,
          cashIncome: 0,
          cashExpense: 0,
          bankIncome: 0,
          bankExpense: 0,
          creditCardExpense: 0,
          debitCardExpense: 0,
          count: 0,
        };
      }
      categoryTotals[catName].count += 1;
      const method = t.paymentMethod || "Cash";
      const isCash = method === "Cash";
      const isBank = method === "Bank" || method === "Bank Transfer";
      const isCredit = method === "Credit Card";
      const isDebit = method === "Debit Card";

      if (t.type === "Income") {
        categoryTotals[catName].income += amount;
        if (isCash) categoryTotals[catName].cashIncome += amount;
        if (isBank) categoryTotals[catName].bankIncome += amount;
      } else {
        categoryTotals[catName].expense += amount;
        if (isCash) categoryTotals[catName].cashExpense += amount;
        if (isBank) categoryTotals[catName].bankExpense += amount;
        if (isCredit) categoryTotals[catName].creditCardExpense += amount;
        if (isDebit) categoryTotals[catName].debitCardExpense += amount;
      }
    });

    return categories.map((cat) => {
      const stats = categoryTotals[cat.name] || {
        income: 0,
        expense: 0,
        cashIncome: 0,
        cashExpense: 0,
        bankIncome: 0,
        bankExpense: 0,
        creditCardExpense: 0,
        debitCardExpense: 0,
        count: 0,
      };
      return {
        id: cat.id,
        name: cat.name,
        incomeTypes: cat.incomeTypes || [],
        expenseTypes: cat.expenseTypes || [],
        income: stats.income,
        expense: stats.expense,
        net: stats.income - stats.expense,
        cashIncome: stats.cashIncome,
        cashExpense: stats.cashExpense,
        bankIncome: stats.bankIncome,
        bankExpense: stats.bankExpense,
        creditCardExpense: stats.creditCardExpense,
        debitCardExpense: stats.debitCardExpense,
        count: stats.count,
      };
    });
  }, [categories, monthTransactions]);

  // Detail breakdown for the selected category in the Net Balance modal (Cash + Bank combined)
  const selectedNetCategoryData = useMemo(() => {
    if (!selectedNetCategory) return null;

    const catTx = monthTransactions.filter((t) => t.category === selectedNetCategory);

    const incomeAgg = {};
    const expenseAgg = {};
    let totalInc = 0;
    let totalExp = 0;
    let cashInc = 0, bankInc = 0;
    let cashExp = 0, bankExp = 0, creditExp = 0, debitExp = 0;

    catTx.forEach((t) => {
      const amount = Number(t.amount) || 0;
      const sub = t.subCategory || "Other";
      const method = t.paymentMethod || "Cash";
      const isCash = method === "Cash";
      const isBank = method === "Bank" || method === "Bank Transfer";
      const isCredit = method === "Credit Card";
      const isDebit = method === "Debit Card";

      if (t.type === "Income") {
        totalInc += amount;
        incomeAgg[sub] = (incomeAgg[sub] || 0) + amount;
        if (isCash) cashInc += amount;
        if (isBank) bankInc += amount;
      } else {
        totalExp += amount;
        expenseAgg[sub] = (expenseAgg[sub] || 0) + amount;
        if (isCash) cashExp += amount;
        if (isBank) bankExp += amount;
        if (isCredit) creditExp += amount;
        if (isDebit) debitExp += amount;
      }
    });

    const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#a855f7', '#d946ef', '#f43f5e', '#8b5cf6', '#ec4899', '#ea580c'];
    const INCOME_COLORS = ['#10b981', '#34d399', '#059669', '#6ee7b7', '#047857', '#0f766e', '#14b8a6', '#2dd4bf'];

    const incomeChart = Object.keys(incomeAgg).map((key, index) => ({
      name: key,
      value: incomeAgg[key],
      color: INCOME_COLORS[index % INCOME_COLORS.length]
    })).sort((a, b) => b.value - a.value);

    const expenseChart = Object.keys(expenseAgg).map((key, index) => ({
      name: key,
      value: expenseAgg[key],
      color: EXPENSE_COLORS[index % EXPENSE_COLORS.length]
    })).sort((a, b) => b.value - a.value);

    // Sort transactions latest first
    const sortedTx = [...catTx].sort((a, b) => {
      const dateA = new Date(`${a.date.toISOString().split('T')[0]}T${a.time || '00:00'}`);
      const dateB = new Date(`${b.date.toISOString().split('T')[0]}T${b.time || '00:00'}`);
      return dateB - dateA;
    });

    return {
      transactions: sortedTx,
      incomeChart,
      expenseChart,
      totalIncome: totalInc,
      totalExpense: totalExp,
      netBalance: totalInc - totalExp,
      cashIncome: cashInc,
      bankIncome: bankInc,
      cashExpense: cashExp,
      bankExpense: bankExp,
      creditExpense: creditExp,
      debitExpense: debitExp,
      count: catTx.length,
    };
  }, [selectedNetCategory, monthTransactions]);

  const monthOptions = useMemo(() => getMonthOptions(), []);
  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Wallet size={22} className="text-emerald-400" />
          Overview
        </h2>
        
        {/* Compact Month Selector */}
        <div className="relative">
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none bg-slate-800/80 border border-slate-700 text-emerald-400 text-sm font-semibold rounded-full pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 backdrop-blur-md"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Top New Entry Button - 3D Cyber Tactile */}
      {onNewEntry && (
        <motion.button
          whileHover={{ scale: 1.015, y: -2 }}
          whileTap={{ scale: 0.985, y: 2 }}
          onClick={onNewEntry}
          className="w-full mb-6 relative overflow-hidden flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black py-4 px-6 rounded-2xl transition-all shadow-[0_12px_28px_-6px_rgba(16,185,129,0.55),inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-3px_0_rgba(4,120,87,0.7)] border-t border-white/40 cursor-pointer group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          <div className="w-7 h-7 rounded-lg bg-black/15 flex items-center justify-center shadow-inner">
            <PlusCircle size={19} className="text-slate-950 stroke-[2.5]" />
          </div>
          <span className="tracking-wider uppercase text-base font-extrabold">New Entry</span>
        </motion.button>
      )}

      {/* 4 Payment Method Cards - 3D Cyber Glass (Cash, Bank, Credit, Debit) */}
      <div className="grid grid-cols-2 gap-3.5 mb-6">
        {/* Cash */}
        <motion.button 
          onClick={() => setSelectedMethod("Cash")}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98, y: 1 }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden p-4 rounded-2xl text-left cursor-pointer outline-none group transition-all
                     bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-emerald-950/30
                     border border-emerald-500/20 border-t-emerald-400/40 border-l-emerald-400/30
                     shadow-[0_12px_24px_-8px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.4)]
                     hover:shadow-[0_16px_32px_-6px_rgba(16,185,129,0.3),inset_0_1px_2px_rgba(255,255,255,0.3)]
                     hover:border-emerald-400/60"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400/25 to-emerald-600/10 border border-emerald-400/35 flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(16,185,129,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform">
                <Banknote size={17} className="text-emerald-300 drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              </div>
              <span className="text-xs font-bold text-white tracking-wide">Cash</span>
            </div>
            <span className="text-[9px] uppercase font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30 shadow-[0_0_8px_rgba(16,185,129,0.25)]">In Hand</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold font-mono text-white tracking-tight drop-shadow-sm">
            {cashBalance < 0 && "−"}{formatCurrency(Math.abs(cashBalance))}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Cash in hand balance</p>
        </motion.button>
        
        {/* Bank Transfer */}
        <motion.button 
          onClick={() => setSelectedMethod("Bank Transfer")}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98, y: 1 }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="relative overflow-hidden p-4 rounded-2xl text-left cursor-pointer outline-none group transition-all
                     bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-sky-950/30
                     border border-sky-500/20 border-t-sky-400/40 border-l-sky-400/30
                     shadow-[0_12px_24px_-8px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.4)]
                     hover:shadow-[0_16px_32px_-6px_rgba(56,189,248,0.3),inset_0_1px_2px_rgba(255,255,255,0.3)]
                     hover:border-sky-400/60"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400/25 to-sky-600/10 border border-sky-400/35 flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(56,189,248,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform">
                <Building2 size={17} className="text-sky-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
              </div>
              <span className="text-xs font-bold text-white tracking-wide truncate">Bank Transfer</span>
            </div>
            <span className="text-[9px] uppercase font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-400/30 shadow-[0_0_8px_rgba(56,189,248,0.25)]">Account</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold font-mono text-white tracking-tight drop-shadow-sm">
            {bankBalance < 0 && "−"}{formatCurrency(Math.abs(bankBalance))}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Bank account balance</p>
        </motion.button>

        {/* Credit Card */}
        <motion.button 
          onClick={() => setSelectedMethod("Credit Card")}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98, y: 1 }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="relative overflow-hidden p-4 rounded-2xl text-left cursor-pointer outline-none group transition-all
                     bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-purple-950/30
                     border border-purple-500/20 border-t-purple-400/40 border-l-purple-400/30
                     shadow-[0_12px_24px_-8px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.4)]
                     hover:shadow-[0_16px_32px_-6px_rgba(168,85,247,0.3),inset_0_1px_2px_rgba(255,255,255,0.3)]
                     hover:border-purple-400/60"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-400/25 to-purple-600/10 border border-purple-400/35 flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(168,85,247,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform">
                <CreditCard size={17} className="text-purple-300 drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
              </div>
              <span className="text-xs font-bold text-white tracking-wide truncate">Credit Card</span>
            </div>
            <span className="text-[9px] uppercase font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-400/30 shadow-[0_0_8px_rgba(168,85,247,0.25)]">Spends</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold font-mono text-purple-300 tracking-tight drop-shadow-sm">
            {formatCurrency(creditCardSpent)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Monthly card spends</p>
        </motion.button>

        {/* Debit Card */}
        <motion.button 
          onClick={() => setSelectedMethod("Debit Card")}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98, y: 1 }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="relative overflow-hidden p-4 rounded-2xl text-left cursor-pointer outline-none group transition-all
                     bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-amber-950/30
                     border border-amber-500/20 border-t-amber-400/40 border-l-amber-400/30
                     shadow-[0_12px_24px_-8px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.4)]
                     hover:shadow-[0_16px_32px_-6px_rgba(245,158,11,0.3),inset_0_1px_2px_rgba(255,255,255,0.3)]
                     hover:border-amber-400/60"
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-400/35 flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(245,158,11,0.3),inset_0_1px_1px_rgba(255,255,255,0.3)] group-hover:scale-105 transition-transform">
                <Wallet size={17} className="text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
              </div>
              <span className="text-xs font-bold text-white tracking-wide truncate">Debit Card</span>
            </div>
            <span className="text-[9px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30 shadow-[0_0_8px_rgba(245,158,11,0.25)]">Spends</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold font-mono text-amber-300 tracking-tight drop-shadow-sm">
            {formatCurrency(debitCardSpent)}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Direct debit spend</p>
        </motion.button>
      </div>

      {/* 3D Cyber Floating Net Balance Slab */}
      <motion.div 
        whileHover={{ scale: 1.015, y: -3 }}
        whileTap={{ scale: 0.985, y: 1 }}
        onClick={() => {
          setShowNetCategoryModal(true);
          setSelectedNetCategory(null);
          setSelectedNetSubFilter(null);
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl p-6 mb-6 cursor-pointer select-none transition-all duration-300 group ${
          isProfitable 
            ? "bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 border border-emerald-400/30 border-t-emerald-300/60 border-l-emerald-300/40 shadow-[0_20px_45px_-12px_rgba(16,185,129,0.45),0_0_35px_rgba(16,185,129,0.2),inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.5)]" 
            : "bg-gradient-to-br from-rose-800 via-slate-900 to-slate-950 border border-rose-500/30 border-t-rose-400/60 border-l-rose-400/40 shadow-[0_20px_45px_-12px_rgba(239,68,68,0.45),0_0_35px_rgba(239,68,68,0.2),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.5)]"
        }`}
      >
        {/* Holographic 3D ambient glows */}
        <div className="absolute -top-28 -right-28 w-56 h-56 bg-white/15 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-black/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.12),transparent_70%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full justify-between gap-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-white/80 text-xs font-bold uppercase tracking-widest drop-shadow-sm">Net Balance</p>
                <span className="text-[10px] bg-black/25 text-white font-extrabold px-2.5 py-0.5 rounded-full border border-white/20 shadow-inner backdrop-blur-md tracking-wider">
                  Cash • Bank • Cards
                </span>
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                {netProfit < 0 && "−"}{formatCurrency(Math.abs(netProfit))}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/25 to-white/5 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-[0_4px_14px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.4)] group-hover:scale-110 transition-transform">
              <Wallet size={22} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
            </div>
          </div>
          
          {/* Income / Expense summary row */}
          <div className="flex gap-6 py-2 px-3 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 shadow-inner">
            <div className="flex-1">
              <p className="text-white/70 text-[10px] uppercase font-bold tracking-wider mb-0.5">Total Income</p>
              <p className="text-emerald-300 font-bold text-sm font-mono flex items-center gap-1">
                <TrendingUp size={14} className="text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="w-px bg-white/15 my-0.5" />
            <div className="flex-1">
              <p className="text-white/70 text-[10px] uppercase font-bold tracking-wider mb-0.5">Total Expense</p>
              <p className="text-red-300 font-bold text-sm font-mono flex items-center gap-1">
                <TrendingDown size={14} className="text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                {formatCurrency(totalExpense)}
              </p>
            </div>
          </div>

          {/* Categories button */}
          <div className="flex justify-end pt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white bg-black/35 hover:bg-black/50 px-3.5 py-1.5 rounded-xl backdrop-blur-md border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] transition-all">
              <span>View Categories</span>
              <ChevronRight size={14} className="text-white/80 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Visual Chart (if data exists) */}
      {chartData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 mb-6 flex flex-col items-center justify-center"
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">In vs Out</p>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex justify-center gap-6 mt-4 w-full">
            {chartData.map((entry, index) => (
              <div key={`legend-${index}`} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{entry.name}</span>
                  <span className="text-sm text-white font-bold tracking-tight">{formatCurrency(entry.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}


      {/* Recent Transactions */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <span>Recent Transactions</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-medium">Click to edit</span>
          <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700">
            {filtered.length > 5 ? "Last 5" : `${filtered.length} entries`}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto mb-3 glow-emerald" />
          <p className="text-slate-400 text-sm font-medium">Loading data…</p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card p-10 text-center flex flex-col items-center justify-center border-dashed border-slate-700"
        >
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
            <Wallet size={24} className="text-slate-500" />
          </div>
          <p className="text-white font-medium">No transactions found</p>
          <p className="text-xs text-slate-500 mt-1">Adjust filters or add a new entry.</p>
        </motion.div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-3" 
          id="transaction-list"
        >
          <AnimatePresence>
            {sortedFiltered.slice(0, 5).map((t) => {
              const isIncome = t.type === "Income";
              const isCash = t.paymentMethod === "Cash";
              const txTime = formatTransactionTime(t.time, t.createdAt);
              return (
                <motion.div
                  key={t.id}
                  variants={itemVariants}
                  onClick={() => setEditingTransaction(t)}
                  className="glass-card p-3.5 flex items-center gap-3 group hover:border-slate-600 hover:bg-slate-900/80 cursor-pointer transition-all active:scale-[0.99]"
                  title="Click to edit or delete"
                >
                  {/* Icon Badge */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isIncome 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>
                    {isIncome ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-bold text-sm tracking-tight truncate max-w-[200px] sm:max-w-xs">
                        {t.category || t.subCategory || "General"}
                      </p>
                      {t.description && (
                        <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          • {t.description}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                      {renderPaymentBadge(t.paymentMethod)}

                      <span className="text-slate-600">•</span>

                      <span className="text-slate-300 font-medium text-[11px] whitespace-nowrap">
                        {t.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                      </span>

                      {txTime && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="font-mono text-slate-300 text-[11px] whitespace-nowrap flex items-center gap-1">
                            <Clock size={11} className="text-slate-400 shrink-0" />
                            {txTime}
                          </span>
                        </>
                      )}
                    </div>

                    {t.description && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-start gap-1">
                        <span className="text-slate-600 shrink-0 mt-px">"</span>
                        <span className="truncate italic text-slate-300">{t.description}</span>
                        <span className="text-slate-600 shrink-0 mt-px">"</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="text-right">
                      <span
                        className={`text-sm sm:text-base font-bold block font-mono tracking-tight whitespace-nowrap ${
                          isIncome ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isIncome ? "+" : "−"} Rs. {Number(t.amount).toLocaleString("en-LK")}
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg text-slate-500 group-hover:text-slate-300 hover:bg-slate-800 transition-colors">
                      <Pencil size={13} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Drill-Down Modal */}
      {createPortal(
        <AnimatePresence>
          {selectedMethod && modalData && (
            <motion.div
              key={`drilldown-modal-${selectedMethod}`}
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[100] bg-slate-950 flex flex-col"
            >
            {/* Header — always at top (no sticky needed outside scroll container) */}
            <div className="shrink-0 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60 px-4 pt-safe pb-4">
              <div className="max-w-lg mx-auto flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedMethod === "Cash" ? (
                    <Banknote size={20} className="text-emerald-400" />
                  ) : selectedMethod === "Credit Card" ? (
                    <CreditCard size={20} className="text-purple-400" />
                  ) : selectedMethod === "Debit Card" ? (
                    <Wallet size={20} className="text-amber-400" />
                  ) : (
                    <Building2 size={20} className="text-sky-400" />
                  )}
                  {selectedMethod} Details
                </h2>
                <button
                  onClick={() => setSelectedMethod(null)}
                  className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <ScrollResetContainer className="flex-1 overflow-y-auto">
            <div className="px-4 pt-6 pb-28 max-w-lg mx-auto w-full">

              {/* ── Hero Net Balance Card (with inline income/expense) ── */}
              <div className={`relative overflow-hidden rounded-3xl p-5 mb-4 border border-white/10 shadow-xl ${
                modalData.total >= 0
                  ? "bg-gradient-to-br from-emerald-600/80 to-sky-700/80"
                  : "bg-gradient-to-br from-red-800/80 to-slate-800/80"
              }`}>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest mb-1">Net Balance</p>
                <p className="text-4xl font-bold text-white tracking-tight mb-4">
                  {modalData.total < 0 ? "−" : ""}{formatCurrency(Math.abs(modalData.total))}
                </p>
                <div className="flex gap-5">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-white/60" />
                    <span className="text-white/50 text-[10px] uppercase tracking-widest">Income</span>
                    <span className="text-white font-bold text-sm font-mono">{formatCurrency(modalData.totalIncome)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingDown size={12} className="text-white/60" />
                    <span className="text-white/50 text-[10px] uppercase tracking-widest">Expense</span>
                    <span className="text-white font-bold text-sm font-mono">{formatCurrency(modalData.totalExpense)}</span>
                  </div>
                </div>
              </div>


              {/* ── Donut Chart (only when data exists) ── */}
              {modalData.chartData.length > 0 && (
                <div className="glass-card p-4 mb-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mb-2">Income vs Expense</p>
                  <div className="w-full h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={modalData.chartData}
                          cx="50%" cy="50%"
                          innerRadius={36} outerRadius={58}
                          paddingAngle={5} dataKey="value" stroke="none"
                        >
                          {modalData.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-5 mt-1">
                    {modalData.chartData.map((entry, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-xs text-slate-400 font-medium">{entry.name}</span>
                        <span className="text-xs font-bold text-white font-mono">{formatCurrency(entry.value).replace("Rs. ", "")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* ── Stacked Bar Chart + Inline Transactions ── */}
              {(() => {
                const INC_COLORS = ['#10b981','#34d399','#6ee7b7','#059669','#14b8a6','#0f766e'];
                const EXP_COLORS = ['#ef4444','#f97316','#f59e0b','#a855f7','#ec4899','#06b6d4','#fb923c','#8b5cf6'];

                const incCats = modalData.breakdown
                  .filter(c => { const f = categories.find(x => x.name === c.name); return f ? f.type === 'Income' : c.income > 0; })
                  .filter(c => c.income > 0);
                const expCats = modalData.breakdown
                  .filter(c => { const f = categories.find(x => x.name === c.name); return f ? f.type === 'Expense' : c.expense > 0; })
                  .filter(c => c.expense > 0);

                // Build stacked bar data rows
                const incEntry = { type: '↑ Income' };
                incCats.forEach(c => { incEntry[c.name] = c.income; });
                const expEntry = { type: '↓ Expenses' };
                expCats.forEach(c => { expEntry[c.name] = c.expense; });
                const stackData = [
                  ...(modalData.totalIncome > 0 ? [incEntry] : []),
                  ...(modalData.totalExpense > 0 ? [expEntry] : []),
                ];

                // Legend items
                const legendItems = [
                  ...incCats.map((c, i) => ({ name: c.name, color: INC_COLORS[i % INC_COLORS.length], amount: c.income, isIncome: true })),
                  ...expCats.map((c, i) => ({ name: c.name, color: EXP_COLORS[i % EXP_COLORS.length], amount: c.expense, isIncome: false })),
                ];

                // Filtered transaction list
                const filteredTx = pmCatFilter
                  ? modalData.transactions.filter(t => t.category === pmCatFilter)
                  : modalData.transactions;

                const renderTxRow = (t) => {
                  const isIncome = t.type === 'Income';
                  const txTime = formatTransactionTime(t.time, t.createdAt);
                  return (
                    <div key={t.id} onClick={() => setEditingTransaction(t)}
                      className="glass-card p-3.5 flex items-center gap-3 hover:bg-slate-900/80 transition-colors border border-slate-800/80 cursor-pointer group"
                      title="Click to edit or delete"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isIncome ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {isIncome ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-bold text-sm truncate max-w-[200px]">{t.category || 'General'}</p>
                          {t.description && <span className="text-[11px] text-slate-400 truncate max-w-[140px]">• {t.description}</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                          {renderPaymentBadge(t.paymentMethod)}
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-300 font-medium text-[11px] whitespace-nowrap">
                            {t.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                          {txTime && (<><span className="text-slate-600">•</span>
                            <span className="font-mono text-slate-300 text-[11px] whitespace-nowrap flex items-center gap-1">
                              <Clock size={11} className="text-slate-400 shrink-0"/>{txTime}
                            </span></>)}
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-slate-400 mt-1 flex items-start gap-1">
                            <span className="text-slate-600 shrink-0">"</span>
                            <span className="truncate italic text-slate-300">{t.description}</span>
                            <span className="text-slate-600 shrink-0">"</span>
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className={`text-sm font-bold font-mono whitespace-nowrap ${
                          isIncome ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {isIncome ? '+' : '−'} Rs. {Number(t.amount).toLocaleString('en-LK')}
                        </span>
                        <div className="p-1.5 rounded-lg text-slate-500 group-hover:text-slate-300 transition-colors">
                          <Pencil size={13}/>
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="mb-6">
                    {/* Stacked Bar Chart */}
                    {stackData.length > 0 && (
                      <div className="glass-card p-4 mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Category Breakdown — tap to filter</p>
                        <div style={{ height: `${stackData.length * 54 + 16}px` }} className="w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stackData} layout="vertical" margin={{ top: 0, right: 6, left: 72, bottom: 0 }}>
                              <XAxis type="number" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'monospace' }}
                                axisLine={false} tickLine={false}
                                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                              <YAxis type="category" dataKey="type" width={68}
                                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                axisLine={false} tickLine={false} />
                              <Tooltip
                                formatter={(value, name) => [formatCurrency(value), name]}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                              />
                              {incCats.map((cat, i) => (
                                <Bar key={`i-${cat.name}`} dataKey={cat.name} stackId="a"
                                  fill={pmCatFilter === cat.name ? INC_COLORS[i % INC_COLORS.length] : `${INC_COLORS[i % INC_COLORS.length]}bb`}
                                  stroke={pmCatFilter === cat.name ? '#fff' : 'none'} strokeWidth={pmCatFilter === cat.name ? 1.5 : 0}
                                  cursor="pointer"
                                  onClick={() => { setPmCatFilter(pmCatFilter === cat.name ? null : cat.name); setVisibleTxLimit(10); }}
                                  radius={i === incCats.length - 1 && expCats.length === 0 ? [0,6,6,0] : [0,0,0,0]}
                                />
                              ))}
                              {expCats.map((cat, i) => (
                                <Bar key={`e-${cat.name}`} dataKey={cat.name} stackId="a"
                                  fill={pmCatFilter === cat.name ? EXP_COLORS[i % EXP_COLORS.length] : `${EXP_COLORS[i % EXP_COLORS.length]}bb`}
                                  stroke={pmCatFilter === cat.name ? '#fff' : 'none'} strokeWidth={pmCatFilter === cat.name ? 1.5 : 0}
                                  cursor="pointer"
                                  onClick={() => { setPmCatFilter(pmCatFilter === cat.name ? null : cat.name); setVisibleTxLimit(10); }}
                                  radius={i === expCats.length - 1 ? [0,6,6,0] : [0,0,0,0]}
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Clickable Legend Pills */}
                        <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                          {legendItems.map(item => (
                            <button key={item.name}
                              onClick={() => { setPmCatFilter(pmCatFilter === item.name ? null : item.name); setVisibleTxLimit(10); }}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                                pmCatFilter === item.name
                                  ? 'border-white/30 bg-slate-700 text-white shadow-md scale-105'
                                  : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline Transaction List */}
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {pmCatFilter ? pmCatFilter : 'All'} Transactions
                        <span className="ml-1.5 text-slate-500 font-mono">({filteredTx.length})</span>
                      </h3>
                      {pmCatFilter && (
                        <button onClick={() => { setPmCatFilter(null); setVisibleTxLimit(10); }}
                          className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1"
                        >
                          <X size={10}/> Clear
                        </button>
                      )}
                    </div>

                    <DateGroupedTxList
                      txList={filteredTx}
                      limit={visibleTxLimit}
                      onMore={() => setVisibleTxLimit(p => p + 10)}
                      onEdit={(t) => setEditingTransaction(t)}
                    />
                  </div>
                );
              })()}
            </div>
            </ScrollResetContainer>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Net Balance & Category Breakdown Modal (Cash + Bank Combined) ── */}
      {createPortal(
        <AnimatePresence>
          {showNetCategoryModal && (
            <motion.div
              key="net-category-breakdown-modal"
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[100] bg-slate-950 flex flex-col"
            >
            {/* Header — always at top */}
            <div className="shrink-0 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60 px-4 pt-safe pb-4">
              <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedNetCategory ? (
                    <button
                      onClick={() => {
                        setSelectedNetCategory(null);
                        setSelectedNetSubFilter(null);
                      }}
                      className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
                      title="Back to Categories"
                    >
                      <ArrowLeft size={18} />
                    </button>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Layers size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-white truncate flex items-center gap-2">
                      {selectedNetCategory ? (
                        <span className="truncate">{selectedNetCategory}</span>
                      ) : (
                        "Category Overview"
                      )}
                    </h2>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                      <span className="text-emerald-400 font-medium">Cash • Bank • Cards</span>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span>{selectedMonth}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowNetCategoryModal(false);
                    setSelectedNetCategory(null);
                    setSelectedNetSubFilter(null);
                  }}
                  className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <ScrollResetContainer className="flex-1 overflow-y-auto">
            <div className="px-4 pt-6 pb-28 max-w-lg mx-auto w-full">
              {!selectedNetCategory ? (
                /* ── SCREEN 1: CATEGORY SELECTION LIST / BOXES ── */
                <div>
                  {/* Overall Hero Summary Card */}
                  <div className={`relative overflow-hidden rounded-3xl p-5 mb-6 border border-white/10 shadow-xl ${
                    netProfit >= 0
                      ? "bg-gradient-to-br from-emerald-600/80 to-sky-700/80"
                      : "bg-gradient-to-br from-red-800/80 to-slate-800/80"
                  }`}>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">Total Net Balance</p>
                      <span className="text-[10px] bg-white/20 text-white font-semibold px-2 py-0.5 rounded-full border border-white/20 tracking-wider">
                        Cash • Bank • Cards
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-white tracking-tight mb-4">
                      {netProfit < 0 ? "−" : ""}{formatCurrency(Math.abs(netProfit))}
                    </p>
                    <div className="flex gap-5">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={13} className="text-emerald-300" />
                        <span className="text-white/60 text-[11px] uppercase tracking-wider">Income</span>
                        <span className="text-white font-bold text-sm font-mono">{formatCurrency(totalIncome)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingDown size={13} className="text-red-300" />
                        <span className="text-white/60 text-[11px] uppercase tracking-wider">Expense</span>
                        <span className="text-white font-bold text-sm font-mono">{formatCurrency(totalExpense)}</span>
                      </div>
                    </div>

                    {/* 4 Payment Methods breakdown grid inside hero */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2 bg-black/20 rounded-xl px-2.5 py-1.5 border border-white/5">
                        <span className="text-sm">💵</span>
                        <div className="min-w-0">
                          <p className="text-white/60 text-[9px] uppercase tracking-wider font-semibold">Cash</p>
                          <p className={`text-xs font-bold font-mono leading-tight ${cashBalance < 0 ? "text-red-300" : "text-white"}`}>
                            {cashBalance < 0 ? "−" : ""}{formatCurrency(Math.abs(cashBalance))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-black/20 rounded-xl px-2.5 py-1.5 border border-white/5">
                        <span className="text-sm">🏦</span>
                        <div className="min-w-0">
                          <p className="text-white/60 text-[9px] uppercase tracking-wider font-semibold">Bank</p>
                          <p className={`text-xs font-bold font-mono leading-tight ${bankBalance < 0 ? "text-red-300" : "text-white"}`}>
                            {bankBalance < 0 ? "−" : ""}{formatCurrency(Math.abs(bankBalance))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-black/20 rounded-xl px-2.5 py-1.5 border border-white/5">
                        <span className="text-sm">💳</span>
                        <div className="min-w-0">
                          <p className="text-white/60 text-[9px] uppercase tracking-wider font-semibold">Credit Card</p>
                          <p className={`text-xs font-bold font-mono leading-tight ${creditCardSpent > 0 ? "text-red-300" : "text-white"}`}>
                            {creditCardSpent > 0 ? "−" : ""}{formatCurrency(creditCardSpent)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-black/20 rounded-xl px-2.5 py-1.5 border border-white/5">
                        <span className="text-sm">💳</span>
                        <div className="min-w-0">
                          <p className="text-white/60 text-[9px] uppercase tracking-wider font-semibold">Debit Card</p>
                          <p className={`text-xs font-bold font-mono leading-tight ${debitCardSpent > 0 ? "text-red-300" : "text-white"}`}>
                            {debitCardSpent > 0 ? "−" : ""}{formatCurrency(debitCardSpent)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Income & Expense Breakdown Chart (Solid Single Colors) + All Transactions List ── */}
                  {(() => {
                    const solidBarData = [
                      ...(totalIncome > 0 ? [{ type: '↑ Income', amount: totalIncome, fill: '#10b981' }] : []),
                      ...(totalExpense > 0 ? [{ type: '↓ Expenses', amount: totalExpense, fill: '#ef4444' }] : []),
                    ];

                    return (
                      <div className="mb-6">
                        {solidBarData.length > 0 && (
                          <div className="glass-card p-4 mb-5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Income &amp; Expense Breakdown</p>
                            <div style={{ height: `${solidBarData.length * 54 + 16}px` }} className="w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={solidBarData} layout="vertical" margin={{ top: 0, right: 16, left: 72, bottom: 0 }}>
                                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 9, fontFamily: 'monospace' }}
                                    axisLine={false} tickLine={false}
                                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                                  <YAxis type="category" dataKey="type" width={68}
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                    axisLine={false} tickLine={false} />
                                  <Tooltip
                                    formatter={(value) => [formatCurrency(value), 'Total']}
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                  />
                                  <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                    {solidBarData.map((entry, index) => (
                                      <Cell key={`solid-bar-${index}`} fill={entry.fill} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* ── ALL TRANSACTIONS (Date & Time grouped, 10 per page, Next button) ── */}
                        <div className="mt-5">
                          <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                              <span>All Transactions</span>
                              <span className="text-slate-500 font-mono">({sortedMonthTransactions.length})</span>
                            </h3>
                          </div>
                          <DateGroupedTxList
                            txList={sortedMonthTransactions}
                            limit={netModalTxLimit}
                            onMore={() => setNetModalTxLimit(p => p + 10)}
                            onEdit={(t) => setEditingTransaction(t)}
                            nextLabel="Next"
                            emptyLabel="No transactions found this month."
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* ── SCREEN 2: SELECTED CATEGORY DETAILED VIEW ── */
                selectedNetCategoryData && (
                  <div className="space-y-6">
                    {/* Quick Category Switcher Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      <button
                        onClick={() => {
                          setSelectedNetCategory(null);
                          setSelectedNetSubFilter(null);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors shrink-0"
                      >
                        <ArrowLeft size={12} /> All Categories
                      </button>
                      {allCategoriesBreakdown.map((c) => {
                        const isSelected = c.name === selectedNetCategory;
                        return (
                          <button
                            key={c.id || c.name}
                            onClick={() => {
                              setSelectedNetCategory(c.name);
                              setSelectedNetSubFilter(null);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border ${
                              isSelected
                                ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20"
                                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800"
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Category Hero Card (Cash + Bank Combined) */}
                    <div className="glass-card p-5 border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Selected Category</p>
                          <h3 className="text-xl font-bold text-white tracking-tight">{selectedNetCategory}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">Net Balance</p>
                          <p className={`text-xl font-bold font-mono ${
                            selectedNetCategoryData.netBalance > 0
                              ? "text-emerald-400"
                              : selectedNetCategoryData.netBalance < 0
                              ? "text-red-400"
                              : "text-slate-400"
                          }`}>
                            {selectedNetCategoryData.netBalance !== 0 ? (selectedNetCategoryData.netBalance < 0 ? "−" : "+") : ""}
                            {formatCurrency(Math.abs(selectedNetCategoryData.netBalance))}
                          </p>
                        </div>
                      </div>

                      {/* Split Summary Cards: Income & Expense across all 4 payment methods */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="glass-card p-3.5 border border-emerald-500/20 bg-emerald-500/5">
                          <p className="text-[10px] text-emerald-400/90 uppercase tracking-widest flex items-center gap-1.5 mb-1 font-semibold">
                            <TrendingUp size={13} /> Total Income
                          </p>
                          <p className="text-lg font-bold font-mono text-emerald-400">
                            {formatCurrency(selectedNetCategoryData.totalIncome)}
                          </p>
                          <div className="mt-1 pt-1.5 border-t border-emerald-500/10 text-[10px] text-slate-400 flex items-center justify-between">
                            <span>Cash: <strong className="text-emerald-300 font-mono">{formatCurrency(selectedNetCategoryData.cashIncome).replace("Rs. ", "")}</strong></span>
                            <span>Bank: <strong className="text-sky-300 font-mono">{formatCurrency(selectedNetCategoryData.bankIncome).replace("Rs. ", "")}</strong></span>
                          </div>
                        </div>

                        <div className="glass-card p-3.5 border border-red-500/20 bg-red-500/5">
                          <p className="text-[10px] text-red-400/90 uppercase tracking-widest flex items-center gap-1.5 mb-1 font-semibold">
                            <TrendingDown size={13} /> Total Expense
                          </p>
                          <p className="text-lg font-bold font-mono text-red-400">
                            {formatCurrency(selectedNetCategoryData.totalExpense)}
                          </p>
                          <div className="mt-1 pt-1.5 border-t border-red-500/10 text-[10px] text-slate-400 grid grid-cols-2 gap-x-2 gap-y-0.5">
                            <span>Cash: <strong className="text-emerald-300 font-mono">{formatCurrency(selectedNetCategoryData.cashExpense).replace("Rs. ", "")}</strong></span>
                            <span>Bank: <strong className="text-sky-300 font-mono">{formatCurrency(selectedNetCategoryData.bankExpense).replace("Rs. ", "")}</strong></span>
                            <span>Credit: <strong className="text-purple-300 font-mono">{formatCurrency(selectedNetCategoryData.creditExpense).replace("Rs. ", "")}</strong></span>
                            <span>Debit: <strong className="text-amber-300 font-mono">{formatCurrency(selectedNetCategoryData.debitExpense).replace("Rs. ", "")}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* 4-payment method pills for this category */}
                      <div className="grid grid-cols-4 gap-1.5 mt-2">
                        <div className="glass-card p-2 text-center border border-emerald-500/20 bg-emerald-500/5">
                          <span className="text-xs">💵</span>
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">Cash</p>
                          <p className="text-[11px] font-bold font-mono text-white truncate">
                            {formatCurrency(selectedNetCategoryData.cashIncome - selectedNetCategoryData.cashExpense)}
                          </p>
                        </div>
                        <div className="glass-card p-2 text-center border border-sky-500/20 bg-sky-500/5">
                          <span className="text-xs">🏦</span>
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">Bank</p>
                          <p className="text-[11px] font-bold font-mono text-white truncate">
                            {formatCurrency(selectedNetCategoryData.bankIncome - selectedNetCategoryData.bankExpense)}
                          </p>
                        </div>
                        <div className="glass-card p-2 text-center border border-purple-500/20 bg-purple-500/5">
                          <span className="text-xs">💳</span>
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">Credit</p>
                          <p className="text-[11px] font-bold font-mono text-purple-300 truncate">
                            {selectedNetCategoryData.creditExpense > 0 ? "−" : ""}{formatCurrency(selectedNetCategoryData.creditExpense)}
                          </p>
                        </div>
                        <div className="glass-card p-2 text-center border border-amber-500/20 bg-amber-500/5">
                          <span className="text-xs">💳</span>
                          <p className="text-[9px] text-slate-400 uppercase font-semibold">Debit</p>
                          <p className="text-[11px] font-bold font-mono text-amber-300 truncate">
                            {selectedNetCategoryData.debitExpense > 0 ? "−" : ""}{formatCurrency(selectedNetCategoryData.debitExpense)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── DUAL CHARTS: 1) Income Breakdown & 2) Expense Breakdown ── */}
                    <div className="space-y-4">
                      {/* 1. Income Breakdown Bar Chart */}
                      {selectedNetCategoryData.incomeChart.length > 0 ? (
                        <div className="glass-card p-4 border border-emerald-500/20">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingUp size={14} /> Income Breakdown
                            </p>
                            <span className="text-[10px] font-mono text-slate-400">
                              {selectedNetCategoryData.incomeChart.length} types
                            </span>
                          </div>
                          <div className="w-full" style={{ height: `${Math.max(120, selectedNetCategoryData.incomeChart.length * 44)}px` }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={selectedNetCategoryData.incomeChart}
                                layout="vertical"
                                margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
                                onClick={(d) => {
                                  if (d && d.activePayload) {
                                    const name = d.activePayload[0]?.payload?.name;
                                    setSelectedNetSubFilter(name === selectedNetSubFilter ? null : name);
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                <XAxis
                                  type="number"
                                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                                  axisLine={false}
                                  tickLine={false}
                                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                                />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  width={90}
                                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  formatter={(value) => [formatCurrency(value), 'Income']}
                                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                                  itemStyle={{ color: '#34d399' }}
                                  cursor={{ fill: 'rgba(16,185,129,0.05)' }}
                                />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                  {selectedNetCategoryData.incomeChart.map((entry, index) => (
                                    <Cell
                                      key={`inc-bar-${index}`}
                                      fill={selectedNetSubFilter === entry.name ? entry.color : `${entry.color}cc`}
                                      stroke={selectedNetSubFilter === entry.name ? '#fff' : 'none'}
                                      strokeWidth={selectedNetSubFilter === entry.name ? 1.5 : 0}
                                    />
                                  ))}
                                  <LabelList
                                    dataKey="value"
                                    position="right"
                                    formatter={(v) => `${Number(v).toLocaleString('en-LK')}`}
                                    style={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}
                                  />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ) : (
                        <div className="glass-card p-4 border border-slate-800/80 text-center">
                          <p className="text-xs text-slate-500 font-medium">No Income entries for {selectedNetCategory} this month.</p>
                        </div>
                      )}

                      {/* 2. Expense Breakdown Bar Chart */}
                      {selectedNetCategoryData.expenseChart.length > 0 ? (
                        <div className="glass-card p-4 border border-red-500/20">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingDown size={14} /> Expense Breakdown
                            </p>
                            <span className="text-[10px] font-mono text-slate-400">
                              {selectedNetCategoryData.expenseChart.length} types
                            </span>
                          </div>
                          <div className="w-full" style={{ height: `${Math.max(120, selectedNetCategoryData.expenseChart.length * 44)}px` }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={selectedNetCategoryData.expenseChart}
                                layout="vertical"
                                margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
                                onClick={(d) => {
                                  if (d && d.activePayload) {
                                    const name = d.activePayload[0]?.payload?.name;
                                    setSelectedNetSubFilter(name === selectedNetSubFilter ? null : name);
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                                <XAxis
                                  type="number"
                                  tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                                  axisLine={false}
                                  tickLine={false}
                                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                                />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  width={90}
                                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                                  axisLine={false}
                                  tickLine={false}
                                />
                                <Tooltip
                                  formatter={(value) => [formatCurrency(value), 'Expense']}
                                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                                  itemStyle={{ color: '#f87171' }}
                                  cursor={{ fill: 'rgba(239,68,68,0.05)' }}
                                />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                  {selectedNetCategoryData.expenseChart.map((entry, index) => (
                                    <Cell
                                      key={`exp-bar-${index}`}
                                      fill={selectedNetSubFilter === entry.name ? entry.color : `${entry.color}cc`}
                                      stroke={selectedNetSubFilter === entry.name ? '#fff' : 'none'}
                                      strokeWidth={selectedNetSubFilter === entry.name ? 1.5 : 0}
                                    />
                                  ))}
                                  <LabelList
                                    dataKey="value"
                                    position="right"
                                    formatter={(v) => `${Number(v).toLocaleString('en-LK')}`}
                                    style={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}
                                  />
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ) : (
                        <div className="glass-card p-4 border border-slate-800/80 text-center">
                          <p className="text-xs text-slate-500 font-medium">No Expense entries for {selectedNetCategory} this month.</p>
                        </div>
                      )}
                    </div>

                    {/* ── TRANSACTIONS LIST (Cash + Bank Combined) ── */}
                    {(() => {
                      let displayTx = selectedNetCategoryData.transactions;
                      if (selectedNetSubFilter) {
                        displayTx = displayTx.filter(t => t.subCategory === selectedNetSubFilter);
                      }
                      const subTotal = displayTx.reduce(
                        (sum, t) => sum + (t.type === "Income" ? Number(t.amount) : -Number(t.amount)),
                        0
                      );

                      return (
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-3 px-1">
                            <div>
                              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                                {selectedNetSubFilter ? `${selectedNetSubFilter} Entries` : "Transactions"}
                                <span className="ml-1.5 text-slate-500 font-mono">({displayTx.length})</span>
                              </h4>
                              {selectedNetSubFilter && (
                                <p className={`text-xs font-bold font-mono mt-0.5 ${subTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  Net: {subTotal < 0 ? "−" : "+"}{formatCurrency(Math.abs(subTotal))}
                                </p>
                              )}
                            </div>
                            {selectedNetSubFilter && (
                              <button
                                onClick={() => setSelectedNetSubFilter(null)}
                                className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                              >
                                Clear Filter
                              </button>
                            )}
                          </div>

                          <div className="space-y-3 pb-12">
                            {displayTx.length === 0 ? (
                              <div className="glass-card p-6 text-center text-slate-500 text-sm">
                                No transactions found.
                              </div>
                            ) : (
                              <DateGroupedTxList
                                txList={displayTx}
                                limit={visibleTxLimit}
                                onMore={() => setVisibleTxLimit(prev => prev + 10)}
                                onEdit={(t) => setEditingTransaction(t)}
                              />
                          )}
                        </div>
                        </div>
                      );
                    })()}
                  </div>
                )
              )}
            </div>
            </ScrollResetContainer>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Category Detail View Modal */}
      {createPortal(
        <AnimatePresence>
          {viewingCategory && categoryDetailsData && (
            <motion.div
              key={`category-detail-modal-${viewingCategory}`}
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[110] bg-slate-950 flex flex-col"
            >
            {/* Header — always at top */}
            <div className="shrink-0 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/60 px-4 pt-safe pb-4">
              <div className="max-w-lg mx-auto flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 truncate">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-emerald-400" />
                  </div>
                  <span className="truncate">{viewingCategory} Details</span>
                </h2>
                <button
                  onClick={() => { setViewingCategory(null); setSelectedSubCategoryFilter(null); setVisibleTxLimit(10); }}
                  className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <ScrollResetContainer className="flex-1 overflow-y-auto">
            <div className="px-4 pt-6 pb-28 max-w-lg mx-auto w-full">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="glass-card p-4 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent">
                  <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                    <TrendingUp size={12} /> Total Income
                  </p>
                  <p className="text-lg font-mono font-bold text-emerald-400">
                    {formatCurrency(categoryDetailsData.totalIncome)}
                  </p>
                </div>
                <div className="glass-card p-4 border border-red-500/20 bg-gradient-to-br from-red-500/10 to-transparent">
                  <p className="text-[10px] text-red-400/80 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                    <TrendingDown size={12} /> Total Expense
                  </p>
                  <p className="text-lg font-mono font-bold text-red-400">
                    {formatCurrency(categoryDetailsData.totalExpense)}
                  </p>
                </div>
              </div>

              {/* Charts */}
              <div className="space-y-4 mb-6">
                {categoryDetailsData.incomeChart.length > 0 && (
                  <div className="glass-card p-4">
                    <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest text-center mb-2">Income Breakdown</p>
                    <div className="w-full h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryDetailsData.incomeChart}
                            cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                            paddingAngle={2} dataKey="value" stroke="none"
                            onClick={(entry) => setSelectedSubCategoryFilter(entry.name)}
                            cursor="pointer"
                          >
                            {categoryDetailsData.incomeChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-3">
                      {categoryDetailsData.incomeChart.map((entry, i) => (
                        <button key={i} onClick={() => setSelectedSubCategoryFilter(entry.name)} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${selectedSubCategoryFilter === entry.name ? 'bg-slate-800 ring-1 ring-emerald-500/50' : 'hover:bg-slate-800/50'}`}>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-[11px] text-slate-300 font-medium">{entry.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {categoryDetailsData.expenseChart.length > 0 && (
                  <div className="glass-card p-4">
                    <p className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest text-center mb-2">Expense Breakdown</p>
                    <div className="w-full h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryDetailsData.expenseChart}
                            cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                            paddingAngle={2} dataKey="value" stroke="none"
                            onClick={(entry) => setSelectedSubCategoryFilter(entry.name)}
                            cursor="pointer"
                          >
                            {categoryDetailsData.expenseChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 mt-3">
                      {categoryDetailsData.expenseChart.map((entry, i) => (
                        <button key={i} onClick={() => setSelectedSubCategoryFilter(entry.name)} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${selectedSubCategoryFilter === entry.name ? 'bg-slate-800 ring-1 ring-red-500/50' : 'hover:bg-slate-800/50'}`}>
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-[11px] text-slate-300 font-medium">{entry.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Transaction List */}
              {(() => {
                let listTx = categoryDetailsData.transactions;
                if (selectedSubCategoryFilter) {
                  listTx = listTx.filter(t => t.subCategory === selectedSubCategoryFilter);
                }
                
                const filterTotal = listTx.reduce((sum, t) => sum + (t.type === "Income" ? Number(t.amount) : -Number(t.amount)), 0);

                return (
                  <>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                          {selectedSubCategoryFilter ? `${selectedSubCategoryFilter} Transactions` : 'All Transactions'}
                        </h3>
                        {selectedSubCategoryFilter && (
                          <p className={`text-sm font-bold font-mono ${filterTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            Total: {filterTotal < 0 ? "−" : ""}{formatCurrency(Math.abs(filterTotal))}
                          </p>
                        )}
                      </div>
                      {selectedSubCategoryFilter && (
                        <button
                          onClick={() => setSelectedSubCategoryFilter(null)}
                          className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-1 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                        >
                          Clear Filter
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-3 pb-10">
                      {listTx.length === 0 ? (
                        <div className="glass-card p-6 text-center text-slate-500 text-sm">
                          No transactions found.
                        </div>
                      ) : (
                        <DateGroupedTxList
                          txList={listTx}
                          limit={visibleTxLimit}
                          onMore={() => setVisibleTxLimit(prev => prev + 10)}
                          onEdit={(t) => setEditingTransaction(t)}
                        />
                    )}
                  </div>
                  </>
                );
              })()}
            </div>
            </ScrollResetContainer>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Edit Transaction Modal */}
      <AnimatePresence>
        {editingTransaction && (
          <EditTransactionModal
            transaction={editingTransaction}
            categories={categories}
            onClose={() => setEditingTransaction(null)}
          />
        )}
      </AnimatePresence>

      {/* Category Manager Modal */}
      <AnimatePresence>
        {managingCategory && (
          <CategoryManagerModal
            categories={categories}
            onClose={() => setManagingCategory(null)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {categoryToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="glass-card w-full max-w-sm overflow-hidden border border-red-500/20 shadow-2xl shadow-red-900/20"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <Trash2 size={28} className="text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Delete Category?</h3>
                <p className="text-sm text-slate-400 mb-6">
                  Are you sure you want to delete <span className="text-white font-semibold">"{categoryToDelete.name}"</span>? 
                  This will not affect existing transactions.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCategoryToDelete(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await deleteCategory(categoryToDelete.id);
                      setExpandedCatId(null);
                      setCategoryToDelete(null);
                    }}
                    className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors shadow-lg shadow-red-500/30"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
