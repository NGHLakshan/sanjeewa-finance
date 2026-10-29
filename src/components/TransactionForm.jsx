import { useState, useEffect, useMemo } from "react";
import { addTransaction } from "../services/transactions";
import { subscribeToCategories } from "../services/categories";
import { PlusCircle, Wallet, CreditCard, Building, Banknote } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export const PAYMENT_METHODS = [
  { id: "Cash", label: "Cash", icon: Banknote, color: "text-emerald-400" },
  { id: "Bank Transfer", label: "Bank Transfer", icon: Building, color: "text-sky-400" },
  { id: "Credit Card", label: "Credit Card", icon: CreditCard, color: "text-purple-400" },
  { id: "Debit Card", label: "Debit Card", icon: Wallet, color: "text-amber-400" },
];

const getDefaultForm = (defaultCategory = "") => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return {
    date: localDate,
    time: pad(now.getHours()) + ':' + pad(now.getMinutes()),
    type: "Income",
    category: defaultCategory,
    amount: "",
    paymentMethod: "Cash",
    description: "",
  };
};

export default function TransactionForm({ onDirtyChange }) {
  // Always scroll to top on mount
  useEffect(() => {
    const scroller = document.getElementById("main-scroller");
    if (scroller) scroller.scrollTop = 0;
    window.scrollTo(0, 0);
  }, []);
  const [form, setForm] = useState(() => getDefaultForm(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Report dirty state if user has entered amount or description
  const isDirty = !!(form.amount?.trim() || form.description?.trim());
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const unsub = subscribeToCategories((data) => {
      setCategories(data);
      setLoadingCategories(false);
      setForm((prev) => {
        if (!prev.category) {
          const matching = data.filter((c) => c.type === prev.type);
          return { ...prev, category: matching.length > 0 ? matching[0].name : (data[0]?.name || "") };
        }
        return prev;
      });
    });
    return unsub;
  }, []);

  // Filter categories matching current transaction type (Income / Expense)
  const availableCategories = useMemo(() => {
    const filtered = categories.filter((c) => c.type === form.type);
    return filtered.length > 0 ? filtered : categories;
  }, [categories, form.type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // When type changes, auto-select first category of that type
      if (name === "type") {
        const matching = categories.filter((c) => c.type === value);
        updated.category = matching.length > 0 ? matching[0].name : "";
      }
      return updated;
    });
  };

  const handleTypeSelect = (selectedType) => {
    setForm((prev) => {
      const matching = categories.filter((c) => c.type === selectedType);
      return {
        ...prev,
        type: selectedType,
        category: matching.length > 0 ? matching[0].name : "",
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!form.category.trim()) {
      toast.error("Please select a Category.");
      return;
    }

    setIsSubmitting(true);

    try {
      await addTransaction({
        ...form,
        subCategory: "", // Subcategory removed for Sanjeewa
      });
      const matching = categories.filter((c) => c.type === form.type);
      setForm({
        ...getDefaultForm(matching.length > 0 ? matching[0].name : ""),
        type: form.type,
        date: form.date,
        time: form.time,
        paymentMethod: form.paymentMethod,
      });
      onDirtyChange?.(false);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(25);
      }
      toast.success(navigator.onLine ? 'Transaction saved successfully!' : 'Saved offline! Will sync when connected.');
    } catch (err) {
      console.error("Failed to save transaction:", err);
      toast.error('Failed to sync. Check console.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <PlusCircle size={22} className="text-emerald-400" />
          New Transaction
        </h2>
        <p className="text-slate-400 text-sm mt-1">Record a new personal income or expense entry.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" id="transaction-form">
        <div className="glass-card p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="form-group">
              <label htmlFor="date" className="form-label">Date</label>
              <input
                id="date"
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            {/* Time */}
            <div className="form-group">
              <label htmlFor="time" className="form-label">Time</label>
              <input
                id="time"
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          {/* Type toggle */}
          <div className="form-group">
            <label className="form-label">Transaction Type</label>
            <div className="grid grid-cols-2 gap-3 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
              {["Income", "Expense"].map((t) => {
                const isSelected = form.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeSelect(t)}
                    className={`relative flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-semibold text-sm select-none z-10 ${
                      isSelected ? "text-white" : "text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="type-pill"
                        className={`absolute inset-0 rounded-xl -z-10 ${
                          t === "Income"
                            ? "bg-gradient-to-r from-emerald-600 to-emerald-500 glow-emerald"
                            : "bg-gradient-to-r from-red-600 to-red-500 glow-red"
                        }`}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <span>{t === "Income" ? "↑" : "↓"}</span>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Dropdown & Quick Selection */}
          <div className="form-group">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="category" className="form-label mb-0">Category</label>
              <span className="text-[11px] text-slate-400">
                {form.type === "Income" ? "Income sources" : "Expense categories"}
              </span>
            </div>

            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              className="form-input text-base"
              disabled={loadingCategories || availableCategories.length === 0}
              required
            >
              {loadingCategories ? (
                <option>Loading categories...</option>
              ) : availableCategories.length === 0 ? (
                <option value="">No {form.type} Categories Found</option>
              ) : (
                availableCategories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))
              )}
            </select>

            {/* Quick Category Chips for top items */}
            {availableCategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {availableCategories.slice(0, 6).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, category: cat.name }))}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      form.category === cat.name
                        ? form.type === "Income"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-red-500/20 text-red-300 border-red-500/40"
                        : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="form-group">
            <label htmlFor="amount" className="form-label">Amount (Rs.)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">Rs.</span>
              <input
                id="amount"
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="form-input pl-11 text-lg font-bold font-mono tracking-tight"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const isSelected = form.paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, paymentMethod: m.id }))}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-slate-800 border-sky-500/60 text-white shadow-md shadow-sky-500/10"
                        : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon size={16} className={m.color} />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description / Note <span className="text-slate-500 font-normal text-xs">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              placeholder="e.g. Keells Super, Petrol shed, Monthly rent..."
              className="form-input resize-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          id="btn-save-transaction"
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-all glow-emerald shadow-xl border border-white/10 text-base"
        >
          {isSubmitting ? (
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          ) : (
            <PlusCircle size={20} />
          )}
          {isSubmitting ? "Saving Entry..." : "Save Transaction"}
        </motion.button>
      </form>
    </div>
  );
}
