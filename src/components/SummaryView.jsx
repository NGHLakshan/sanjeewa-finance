import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, Calendar, ChevronLeft, ChevronRight,
  BarChart2, Layers, Clock, ArrowUpRight, ArrowDownRight, ChevronRight as ChevronRightIcon,
  Check, X
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell
} from "recharts";

// ── helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (n) =>
  `Rs. ${Number(n).toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const startOfWeek = (d) => {
  const day = new Date(d);
  day.setDate(day.getDate() - day.getDay());
  day.setHours(0, 0, 0, 0);
  return day;
};
const endOfWeek = (d) => {
  const day = new Date(startOfWeek(d));
  day.setDate(day.getDate() + 6);
  day.setHours(23, 59, 59, 999);
  return day;
};
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
const startOfYear  = (d) => new Date(d.getFullYear(), 0, 1);
const endOfYear    = (d) => new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);

const formatDayLabel   = (d) => d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
const formatWeekLabel  = (d) => {
  const s = startOfWeek(d), e = endOfWeek(d);
  const fmt = (x) => x.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  return `${fmt(s)} – ${fmt(e)}, ${s.getFullYear()}`;
};
const formatMonthLabel = (d) => d.toLocaleDateString("en-LK", { month: "long", year: "numeric" });
const formatYearLabel  = (d) => d.getFullYear().toString();

// ── main component ────────────────────────────────────────────────────────────
export default function SummaryView({ transactions }) {
  const [period, setPeriod]       = useState("week"); // "day" | "week" | "month"
  const [cursor, setCursor]       = useState(() => new Date());
  const [expandedCat, setExpandedCat] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null); // null = All, or category name string (e.g. "Salary")

  // ── window boundaries ────────────────────────────────────────────────────────
  const { windowStart, windowEnd, label, emptyBars } = useMemo(() => {
    let ws, we, lbl, bars;
    if (period === "day") {
      ws = new Date(cursor); ws.setHours(0, 0, 0, 0);
      we = new Date(cursor); we.setHours(23, 59, 59, 999);
      lbl = formatDayLabel(cursor);
      bars = Array.from({ length: 24 }, (_, h) => ({
        label: h % 3 === 0 ? `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? "a" : "p"}` : "",
        _h: h, income: 0, expense: 0
      }));
    } else if (period === "week") {
      ws = startOfWeek(cursor); we = endOfWeek(cursor);
      lbl = formatWeekLabel(cursor);
      bars = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => ({ label: d, _i: i, income: 0, expense: 0 }));
    } else if (period === "month") {
      ws = startOfMonth(cursor); we = endOfMonth(cursor);
      lbl = formatMonthLabel(cursor);
      const weeksCount = Math.ceil(we.getDate() / 7);
      bars = Array.from({ length: weeksCount }, (_, i) => ({ label: `Wk ${i + 1}`, _w: i + 1, income: 0, expense: 0 }));
    } else {
      ws = startOfYear(cursor); we = endOfYear(cursor);
      lbl = formatYearLabel(cursor);
      bars = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => ({ label: m, _m: i, income: 0, expense: 0 }));
    }
    return { windowStart: ws, windowEnd: we, label: lbl, emptyBars: bars };
  }, [period, cursor]);

  // ── aggregate ────────────────────────────────────────────────────────────────
  const { filtered, totals, catBreakdown, barChartData, pieData } = useMemo(() => {
    const inWindow = transactions.filter((t) => {
      const td = t.date instanceof Date ? t.date : new Date(t.date);
      return td >= windowStart && td <= windowEnd;
    });

    let inc = 0, exp = 0;
    let cashInc = 0, bankInc = 0;
    let cashExp = 0, bankExp = 0, creditExp = 0, debitExp = 0;
    const catMap = {};
    const filledBars = emptyBars.map((b) => ({ ...b }));

    inWindow.forEach((t) => {
      const amount = Number(t.amount) || 0;
      const td = t.date instanceof Date ? t.date : new Date(t.date);
      const isIncome = t.type === "Income";
      const method = t.paymentMethod || "Cash";
      const isCash = method === "Cash";
      const isBank = method === "Bank" || method === "Bank Transfer";
      const isCredit = method === "Credit Card";
      const isDebit = method === "Debit Card";

      if (isIncome) {
        inc += amount;
        if (isCash) cashInc += amount;
        else if (isBank) bankInc += amount;
      } else {
        exp += amount;
        if (isCash) cashExp += amount;
        else if (isBank) bankExp += amount;
        else if (isCredit) creditExp += amount;
        else if (isDebit) debitExp += amount;
      }

      // bar data
      if (period === "day") {
        const b = filledBars[td.getHours()];
        if (b) { if (isIncome) b.income += amount; else b.expense += amount; }
      } else if (period === "week") {
        const b = filledBars[td.getDay()];
        if (b) { if (isIncome) b.income += amount; else b.expense += amount; }
      } else if (period === "month") {
        const wk = Math.ceil(td.getDate() / 7);
        const b = filledBars.find((x) => x._w === wk);
        if (b) { if (isIncome) b.income += amount; else b.expense += amount; }
      } else {
        const b = filledBars[td.getMonth()];
        if (b) { if (isIncome) b.income += amount; else b.expense += amount; }
      }

      // category map
      const cat = t.category || "Uncategorized";
      if (!catMap[cat]) catMap[cat] = { income: 0, expense: 0, txns: [] };
      if (isIncome) catMap[cat].income += amount; else catMap[cat].expense += amount;
      catMap[cat].txns.push(t);
    });

    const catArr = Object.entries(catMap)
      .map(([name, v]) => ({ name, ...v, net: v.income - v.expense }))
      .sort((a, b) => (b.income + b.expense) - (a.income + a.expense));

    const pie = [
      { name: "Income",  value: inc, color: "#10b981" },
      { name: "Expense", value: exp, color: "#ef4444" },
    ].filter((d) => d.value > 0);

    return {
      filtered: inWindow,
      totals: { inc, exp, cashInc, bankInc, cashExp, bankExp, creditExp, debitExp },
      catBreakdown: catArr,
      barChartData: filledBars,
      pieData: pie,
    };
  }, [transactions, windowStart, windowEnd, period, emptyBars]);

  // Calculate payment method stats (for selectedCategory or all transactions in current window)
  const methodStats = useMemo(() => {
    const targetTxns = selectedCat
      ? filtered.filter((t) => (t.category || "Uncategorized") === selectedCat)
      : filtered;

    let cashInc = 0, bankInc = 0;
    let cashExp = 0, bankExp = 0, creditExp = 0, debitExp = 0;

    targetTxns.forEach((t) => {
      const amount = Number(t.amount) || 0;
      const isIncome = t.type === "Income";
      const method = t.paymentMethod || "Cash";
      const isCash = method === "Cash";
      const isBank = method === "Bank" || method === "Bank Transfer";
      const isCredit = method === "Credit Card";
      const isDebit = method === "Debit Card";

      if (isIncome) {
        if (isCash) cashInc += amount;
        else if (isBank) bankInc += amount;
      } else {
        if (isCash) cashExp += amount;
        else if (isBank) bankExp += amount;
        else if (isCredit) creditExp += amount;
        else if (isDebit) debitExp += amount;
      }
    });

    return { cashInc, cashExp, bankInc, bankExp, creditExp, debitExp, totalTx: targetTxns.length };
  }, [filtered, selectedCat]);

  // ── navigation ───────────────────────────────────────────────────────────────
  const navigate = (dir) => {
    setSelectedCat(null);
    const next = new Date(cursor);
    if (period === "day")   next.setDate(next.getDate() + dir);
    else if (period === "week") next.setDate(next.getDate() + dir * 7);
    else if (period === "month") next.setMonth(next.getMonth() + dir);
    else next.setFullYear(next.getFullYear() + dir);
    setCursor(next);
    setExpandedCat(null);
  };

  const isCurrentWindow = useMemo(() => {
    const now = new Date();
    if (period === "day")   return isoDate(cursor) === isoDate(now);
    if (period === "week")  return now >= windowStart && now <= windowEnd;
    if (period === "month") return cursor.getMonth() === now.getMonth() && cursor.getFullYear() === now.getFullYear();
    return cursor.getFullYear() === now.getFullYear();
  }, [cursor, period, windowStart, windowEnd]);

  const net = totals.inc - totals.exp;
  const isProfitable = net >= 0;
  const hasData = filtered.length > 0;

  const periodTabs = [
    { id: "day",   label: "Day",   icon: Clock },
    { id: "week",  label: "Week",  icon: Calendar },
    { id: "month", label: "Month", icon: BarChart2 },
    { id: "year",  label: "Yearly", icon: Layers },
  ];

  const barLabel = period === "day" ? "Hourly" : period === "week" ? "Daily" : period === "month" ? "Weekly" : "Monthly";

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart2 size={22} className="text-emerald-400" />
          Summary
        </h2>
      </div>

      {/* Period Toggle */}
      <div className="flex gap-1.5 p-1.5 bg-slate-900/60 border border-slate-800 rounded-2xl mb-5 backdrop-blur-md">
        {periodTabs.map(({ id, label, icon: Icon }) => {
          const active = period === id;
          return (
            <button
              key={id}
              id={`summary-period-${id}`}
              onClick={() => { setPeriod(id); setCursor(new Date()); setExpandedCat(null); }}
              className={`flex-1 relative flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                active ? "text-white" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sum-period-pill"
                  className="absolute inset-0 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 rounded-xl -z-10 shadow-lg shadow-emerald-500/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Date Navigator */}
      <div className="flex items-center justify-between mb-5 glass-card px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="text-center flex-1 px-3">
          <p className="text-white font-semibold text-sm leading-tight truncate">{label}</p>
          {isCurrentWindow && (
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
              Current {period}
            </span>
          )}
        </div>

        <button
          onClick={() => navigate(1)}
          disabled={isCurrentWindow}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${period}-${isoDate(cursor)}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {!hasData ? (
            <div className="glass-card p-10 text-center flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                <Wallet size={24} className="text-slate-500" />
              </div>
              <p className="text-slate-300 font-medium text-sm">No transactions found</p>
              <p className="text-slate-500 text-xs">Try navigating to a different {period}.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="glass-card p-3 border border-emerald-500/20 bg-emerald-500/5">
                  <p className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-widest mb-1 truncate">Income</p>
                  <p className="text-sm font-bold text-emerald-400 font-mono leading-tight truncate">
                    Rs.&nbsp;{Number(totals.inc).toLocaleString("en-LK")}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <ArrowUpRight size={10} className="text-emerald-500 shrink-0" />
                    <span className="text-[10px] text-slate-500 truncate">{filtered.filter(t => t.type === "Income").length} entries</span>
                  </div>
                </div>

                <div className="glass-card p-3 border border-red-500/20 bg-red-500/5">
                  <p className="text-[10px] font-semibold text-red-400/80 uppercase tracking-widest mb-1 truncate">Expense</p>
                  <p className="text-sm font-bold text-red-400 font-mono leading-tight truncate">
                    Rs.&nbsp;{Number(totals.exp).toLocaleString("en-LK")}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <ArrowDownRight size={10} className="text-red-500 shrink-0" />
                    <span className="text-[10px] text-slate-500 truncate">{filtered.filter(t => t.type === "Expense").length} entries</span>
                  </div>
                </div>

                <div className={`glass-card p-3 border ${isProfitable ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1 truncate">Net</p>
                  <p className={`text-sm font-bold font-mono leading-tight truncate ${isProfitable ? "text-emerald-400" : "text-red-400"}`}>
                    {isProfitable ? "+" : "−"}&nbsp;Rs.&nbsp;{Number(Math.abs(net)).toLocaleString("en-LK")}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-1.5 block">{filtered.length} total</span>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="glass-card p-4 mb-5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">{barLabel} Breakdown</p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} barGap={2} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        formatter={(v) => formatCurrency(v)}
                        contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", color: "#fff", fontSize: "11px" }}
                        itemStyle={{ color: "#fff" }}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Bar dataKey="income"  fill="#10b981" radius={[4,4,0,0]} maxBarSize={20} />
                      <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-6 mt-2">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[10px] text-slate-400">Income</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] text-slate-400">Expense</span></div>
                </div>
              </div>

              {/* ── UNIFIED PAYMENT METHODS & CATEGORIES BOARD ── */}
              <div className="glass-card p-4 mb-5">
                {/* Header with Selected Category Info & Reset Button */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Wallet size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Payment Breakdown
                    </span>
                    {selectedCat ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm flex items-center gap-1">
                        <span>{selectedCat}</span>
                        <span className="text-[9px] text-emerald-400/80 font-mono">({methodStats.totalTx} txns)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/80">
                        All Categories
                      </span>
                    )}
                  </div>
                  {selectedCat && (
                    <button
                      type="button"
                      onClick={() => setSelectedCat(null)}
                      className="text-[10px] font-bold bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <X size={10} />
                      <span>Show All</span>
                    </button>
                  )}
                </div>

                {/* 4 Payment Method Boxes (Cash, Bank, Credit, Debit) */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    {
                      id: "Cash",
                      label: "Cash",
                      emoji: "💵",
                      inc: methodStats.cashInc,
                      exp: methodStats.cashExp,
                      isCard: false,
                      bg: "bg-emerald-500/10 border-emerald-500/20",
                      textColor: "text-emerald-400",
                      dividerColor: "border-emerald-500/20",
                    },
                    {
                      id: "Bank",
                      label: "Bank",
                      emoji: "🏦",
                      inc: methodStats.bankInc,
                      exp: methodStats.bankExp,
                      isCard: false,
                      bg: "bg-sky-500/10 border-sky-500/20",
                      textColor: "text-sky-400",
                      dividerColor: "border-sky-500/20",
                    },
                    {
                      id: "Credit",
                      label: "Credit",
                      emoji: "💳",
                      inc: 0,
                      exp: methodStats.creditExp,
                      isCard: true,
                      bg: "bg-purple-500/10 border-purple-500/20",
                      textColor: "text-purple-400",
                      dividerColor: "border-purple-500/20",
                    },
                    {
                      id: "Debit",
                      label: "Debit",
                      emoji: "💳",
                      inc: 0,
                      exp: methodStats.debitExp,
                      isCard: true,
                      bg: "bg-amber-500/10 border-amber-500/20",
                      textColor: "text-amber-400",
                      dividerColor: "border-amber-500/20",
                    },
                  ].map((m) => {
                    const mNet = m.inc - m.exp;
                    const hasActivity = m.inc > 0 || m.exp > 0;
                    const isHighlighted = selectedCat && hasActivity;

                    const highlightMap = {
                      Cash: {
                        card: "bg-emerald-500/25 border-emerald-400 ring-2 ring-emerald-400/60 shadow-[0_0_22px_rgba(16,185,129,0.45)] scale-[1.02]",
                        badge: "bg-emerald-400 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.7)]",
                      },
                      Bank: {
                        card: "bg-sky-500/25 border-sky-400 ring-2 ring-sky-400/60 shadow-[0_0_22px_rgba(56,189,248,0.45)] scale-[1.02]",
                        badge: "bg-sky-400 text-slate-950 font-black shadow-[0_0_10px_rgba(56,189,248,0.7)]",
                      },
                      Credit: {
                        card: "bg-purple-500/25 border-purple-400 ring-2 ring-purple-400/60 shadow-[0_0_22px_rgba(168,85,247,0.45)] scale-[1.02]",
                        badge: "bg-purple-400 text-slate-950 font-black shadow-[0_0_10px_rgba(168,85,247,0.7)]",
                      },
                      Debit: {
                        card: "bg-amber-500/25 border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_22px_rgba(245,158,11,0.45)] scale-[1.02]",
                        badge: "bg-amber-400 text-slate-950 font-black shadow-[0_0_10px_rgba(245,158,11,0.7)]",
                      },
                    };

                    const cardStyles = isHighlighted
                      ? highlightMap[m.id].card
                      : selectedCat && !hasActivity
                      ? "opacity-30 bg-slate-900/30 border-slate-800/60 scale-[0.98]"
                      : `${m.bg} ${hasActivity ? "opacity-100" : "opacity-60"}`;

                    return (
                      <div
                        key={m.id}
                        className={`rounded-xl p-3 border transition-all duration-300 ${cardStyles}`}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-sm">{m.emoji}</span>
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${m.textColor} truncate`}>
                              {m.label}
                            </span>
                          </div>
                          {isHighlighted ? (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${highlightMap[m.id].badge}`}>
                              <Check size={8} className="stroke-[3]" /> Active
                            </span>
                          ) : hasActivity ? (
                            <span className="text-[9px] font-mono font-bold text-slate-300">Active</span>
                          ) : (
                            <span className="text-[9px] text-slate-500 font-mono">Rs. 0</span>
                          )}
                        </div>

                        <div className="space-y-1">
                          {!m.isCard ? (
                            <>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-400">In</span>
                                <span className="font-bold text-emerald-400 font-mono">
                                  Rs. {Number(m.inc).toLocaleString("en-LK")}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-400">Out</span>
                                <span className="font-bold text-red-400 font-mono">
                                  Rs. {Number(m.exp).toLocaleString("en-LK")}
                                </span>
                              </div>
                              <div className={`border-t ${m.dividerColor} pt-1 flex justify-between items-center text-[10px]`}>
                                <span className="text-slate-300 font-medium">Net</span>
                                <span className={`font-bold font-mono ${mNet >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                                  {mNet >= 0 ? "+" : "−"} Rs. {Number(Math.abs(mNet)).toLocaleString("en-LK")}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-400">Spent</span>
                                <span className={`font-bold font-mono ${m.textColor}`}>
                                  Rs. {Number(m.exp).toLocaleString("en-LK")}
                                </span>
                              </div>
                              <div className={`border-t ${m.dividerColor} pt-1 flex justify-between items-center text-[10px]`}>
                                <span className="text-slate-400">Type</span>
                                <span className={`font-semibold ${m.textColor}`}>Card Expense</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Divider with Guidance */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800/80" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-slate-900/90 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border border-slate-800 rounded-full py-0.5">
                      <Layers size={11} className="text-emerald-400" />
                      Tap category to inspect payment methods
                    </span>
                  </div>
                </div>

                {/* ── CATEGORIES (Income Categories & Expense Categories) ── */}
                {catBreakdown.length === 0 ? (
                  <div className="py-4 text-center text-slate-500 text-xs">
                    No categories found in this period.
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
                    {/* Income Categories */}
                    {catBreakdown.some((c) => c.income > 0) && (
                      <div>
                        <div className="flex items-center justify-between mb-2 px-0.5">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Income Categories
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {catBreakdown.filter((c) => c.income > 0).length} categories
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {catBreakdown
                            .filter((c) => c.income > 0)
                            .map((cat, i) => {
                              const isSelected = selectedCat === cat.name;
                              const colors = ["#10b981", "#34d399", "#059669", "#14b8a6", "#06b6d4", "#0ea5e9"];
                              const dotColor = colors[i % colors.length];
                              return (
                                <button
                                  key={cat.name}
                                  type="button"
                                  onClick={() => setSelectedCat(isSelected ? null : cat.name)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                                    isSelected
                                      ? "bg-emerald-500/25 border-emerald-400 text-white shadow-[0_0_14px_rgba(16,185,129,0.4)] ring-2 ring-emerald-400/50 scale-105"
                                      : selectedCat
                                      ? "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                                      : "bg-slate-900/80 border-slate-700/80 text-white hover:border-emerald-500/50 hover:bg-slate-800"
                                  }`}
                                >
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                                  <span>{cat.name}</span>
                                  {isSelected && <Check size={11} className="text-emerald-400 ml-0.5" />}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Expense Categories */}
                    {catBreakdown.some((c) => c.expense > 0) && (
                      <div>
                        <div className="flex items-center justify-between mb-2 px-0.5">
                          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Expense Categories
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {catBreakdown.filter((c) => c.expense > 0).length} categories
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {catBreakdown
                            .filter((c) => c.expense > 0)
                            .map((cat, i) => {
                              const isSelected = selectedCat === cat.name;
                              const colors = ["#ef4444", "#f97316", "#f59e0b", "#a855f7", "#ec4899", "#f43f5e"];
                              const dotColor = colors[i % colors.length];
                              return (
                                <button
                                  key={cat.name}
                                  type="button"
                                  onClick={() => setSelectedCat(isSelected ? null : cat.name)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                                    isSelected
                                      ? "bg-red-500/25 border-red-400 text-white shadow-[0_0_14px_rgba(239,68,68,0.4)] ring-2 ring-red-400/50 scale-105"
                                      : selectedCat
                                      ? "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                                      : "bg-slate-900/80 border-slate-700/80 text-white hover:border-red-500/50 hover:bg-slate-800"
                                  }`}
                                >
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                                  <span>{cat.name}</span>
                                  {isSelected && <Check size={11} className="text-red-400 ml-0.5" />}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
