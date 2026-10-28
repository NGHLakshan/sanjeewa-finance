import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Wallet, Calendar, ChevronLeft, ChevronRight,
  BarChart2, Layers, Clock, ArrowUpRight, ArrowDownRight, ChevronRight as ChevronRightIcon
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

  // ── navigation ───────────────────────────────────────────────────────────────
  const navigate = (dir) => {
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

              {/* 4 Payment Methods (Cash, Bank, Credit Card, Debit Card) */}
              <div className="glass-card p-4 mb-5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Payment Methods</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Cash", emoji: "💵", color: "emerald", inc: totals.cashInc, exp: totals.cashExp, isCard: false },
                    { label: "Bank Transfer", emoji: "🏦", color: "sky", inc: totals.bankInc, exp: totals.bankExp, isCard: false },
                    { label: "Credit Card", emoji: "💳", color: "purple", inc: 0, exp: totals.creditExp, isCard: true },
                    { label: "Debit Card", emoji: "💳", color: "amber", inc: 0, exp: totals.debitExp, isCard: true },
                  ].map(({ label: ml, emoji, color, inc: mInc, exp: mExp, isCard }) => {
                    const mNet = mInc - mExp;
                    return (
                      <div key={ml} className={`bg-${color}-500/10 border border-${color}-500/20 rounded-xl p-3`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-sm">{emoji}</span>
                          <span className={`text-[11px] font-semibold text-${color}-400 uppercase tracking-wider truncate`}>{ml}</span>
                        </div>
                        <div className="space-y-1">
                          {!isCard ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-[10px] text-slate-400">In</span>
                                <span className="text-[10px] font-bold text-emerald-400 font-mono">Rs. {Number(mInc).toLocaleString("en-LK")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[10px] text-slate-400">Out</span>
                                <span className="text-[10px] font-bold text-red-400 font-mono">Rs. {Number(mExp).toLocaleString("en-LK")}</span>
                              </div>
                              <div className={`border-t border-${color}-500/20 pt-1 flex justify-between`}>
                                <span className="text-[10px] text-slate-300 font-medium">Net</span>
                                <span className={`text-[10px] font-bold font-mono ${mNet >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                                  {mNet >= 0 ? "+" : "−"} Rs. {Number(Math.abs(mNet)).toLocaleString("en-LK")}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-[10px] text-slate-400">Total Spent</span>
                                <span className={`text-[10px] font-bold font-mono text-${color}-300`}>Rs. {Number(mExp).toLocaleString("en-LK")}</span>
                              </div>
                              <div className={`border-t border-${color}-500/20 pt-1 flex justify-between`}>
                                <span className="text-[10px] text-slate-400">Type</span>
                                <span className={`text-[10px] font-semibold text-${color}-400`}>Card Expense</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
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

              {/* Pie Chart */}
              {pieData.length > 0 && (
                <div className="glass-card p-4 mb-5 flex flex-col items-center">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 self-start">In vs Out</p>
                  <div className="w-full h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                          {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip
                          formatter={(v) => formatCurrency(v)}
                          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", color: "#fff", fontSize: "11px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-6">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider">{d.name}</p>
                          <p className="text-sm font-bold text-white font-mono">{formatCurrency(d.value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              {catBreakdown.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-1.5">
                    <Layers size={12} />
                    Category Breakdown
                    <span className="text-slate-600 font-mono">({catBreakdown.length})</span>
                  </p>
                  <div className="space-y-2">
                    {catBreakdown.map((cat) => {
                      const isExp = expandedCat === cat.name;
                      const catNet = cat.income - cat.expense;
                      const vol = cat.income + cat.expense;
                      const incPct = vol > 0 ? (cat.income / vol) * 100 : 0;
                      return (
                        <motion.div key={cat.name} layout className="glass-card overflow-hidden">
                          <button
                            onClick={() => setExpandedCat(isExp ? null : cat.name)}
                            className="w-full p-3.5 flex items-center gap-3 text-left hover:bg-slate-800/30 transition-colors"
                          >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border text-[10px] font-bold ${
                              catNet >= 0
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                            }`}>
                              {cat.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-white font-semibold text-sm truncate">{cat.name}</p>
                                <span className={`text-sm font-bold font-mono shrink-0 ml-2 ${catNet >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                  {catNet >= 0 ? "+" : "−"} Rs.&nbsp;{Number(Math.abs(catNet)).toLocaleString("en-LK")}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-1">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${incPct}%` }} />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-emerald-500 font-mono">↑ {formatCurrency(cat.income)}</span>
                                <span className="text-[10px] text-red-400 font-mono">↓ {formatCurrency(cat.expense)}</span>
                                <span className="text-[10px] text-slate-500">{cat.txns.length} txns</span>
                              </div>
                            </div>
                            <ChevronRight
                              size={14}
                              className={`text-slate-500 shrink-0 transition-transform duration-200 ${isExp ? "rotate-90" : ""}`}
                            />
                          </button>

                          <AnimatePresence>
                            {isExp && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-slate-800/60 px-3.5 py-3 space-y-2 bg-slate-900/30">
                                  {cat.txns
                                    .sort((a, b) => {
                                      const da = a.date instanceof Date ? a.date : new Date(a.date);
                                      const db = b.date instanceof Date ? b.date : new Date(b.date);
                                      return db - da;
                                    })
                                    .map((t) => {
                                      const isIncome = t.type === "Income";
                                      const td = t.date instanceof Date ? t.date : new Date(t.date);
                                      return (
                                        <div key={t.id} className="flex items-center gap-2.5 py-1">
                                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                            isIncome
                                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                              : "bg-red-500/10 border-red-500/20 text-red-400"
                                          }`}>
                                            {isIncome ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-white text-xs font-semibold truncate">{t.category || t.subCategory || "General"}</p>
                                            <p className="text-[10px] text-slate-400">
                                              {td.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                              {t.time ? ` • ${t.time}` : ""}
                                              {t.description ? ` • ${t.description}` : ""}
                                              {" • "}
                                              <span className={
                                                t.paymentMethod === "Cash"
                                                  ? "text-emerald-400"
                                                  : t.paymentMethod === "Credit Card"
                                                  ? "text-purple-400"
                                                  : t.paymentMethod === "Debit Card"
                                                  ? "text-amber-400"
                                                  : "text-sky-400"
                                              }>
                                                {t.paymentMethod || "Cash"}
                                              </span>
                                            </p>
                                          </div>
                                          <span className={`text-xs font-bold font-mono shrink-0 ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
                                            {isIncome ? "+" : "−"} Rs.&nbsp;{Number(t.amount).toLocaleString("en-LK")}
                                          </span>
                                        </div>
                                      );
                                    })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
