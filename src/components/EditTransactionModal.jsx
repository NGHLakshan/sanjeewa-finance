import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Check, AlertTriangle, Calendar, Clock, ArrowUpRight, ArrowDownRight, Banknote, Building, CreditCard, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { updateTransaction, deleteTransaction } from "../services/transactions";

export const PAYMENT_METHODS = [
  { id: "Cash", label: "Cash", icon: Banknote },
  { id: "Bank Transfer", label: "Bank Transfer", icon: Building },
  { id: "Credit Card", label: "Credit Card", icon: CreditCard },
  { id: "Debit Card", label: "Debit Card", icon: Wallet },
];

export default function EditTransactionModal({ transaction, categories = [], onClose }) {
  if (!transaction) return null;

  const getInitialDate = (d) => {
    if (!d) return new Date().toISOString().split("T")[0];
    const jsDate = d instanceof Date ? d : new Date(d);
    if (isNaN(jsDate.getTime())) return new Date().toISOString().split("T")[0];
    const pad = (n) => String(n).padStart(2, "0");
    return `${jsDate.getFullYear()}-${pad(jsDate.getMonth() + 1)}-${pad(jsDate.getDate())}`;
  };

  const getInitialTime = (tx) => {
    if (tx.time && typeof tx.time === "string" && tx.time.trim()) {
      return tx.time.trim();
    }
    if (tx.createdAt) {
      try {
        const d = tx.createdAt.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt.seconds ? tx.createdAt.seconds * 1000 : tx.createdAt);
        if (!isNaN(d.getTime())) {
          const pad = (n) => String(n).padStart(2, "0");
          return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
      } catch (e) {
        // ignore
      }
    }
    return "";
  };

  const initialType = transaction.type || "Expense";
  const matchingCats = categories.filter((c) => c.type === initialType);
  const initialCategory = transaction.category || (matchingCats[0]?.name || categories[0]?.name || "");

  const [form, setForm] = useState({
    date: getInitialDate(transaction.date),
    time: getInitialTime(transaction),
    type: initialType,
    category: initialCategory,
    subCategory: transaction.subCategory || "",
    amount: transaction.amount !== undefined ? String(transaction.amount) : "",
    paymentMethod: transaction.paymentMethod || "Cash",
    description: transaction.description || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Categories matching current selected type
  const availableCategories = useMemo(() => {
    const filtered = categories.filter((c) => c.type === form.type);
    return filtered.length > 0 ? filtered : categories;
  }, [categories, form.type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTypeChange = (newType) => {
    setForm((prev) => {
      const filtered = categories.filter((c) => c.type === newType);
      const newCategory = filtered.length > 0 ? filtered[0].name : prev.category;
      return {
        ...prev,
        type: newType,
        category: newCategory,
      };
    });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    if (!form.category.trim()) {
      toast.error("Category is required.");
      return;
    }

    setIsSaving(true);
    try {
      await updateTransaction(transaction.id, {
        ...form,
        amount: Number(form.amount),
        subCategory: "", // Subcategory removed
      });
      toast.success("Transaction updated successfully!");
      onClose();
    } catch (err) {
      console.error("Error updating transaction:", err);
      toast.error("Failed to update transaction.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTransaction(transaction.id);
      toast.success("Transaction deleted successfully!");
      onClose();
    } catch (err) {
      console.error("Error deleting transaction:", err);
      toast.error("Failed to delete transaction.");
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Dimmed backdrop - click to dismiss */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      {/* Bottom Sheet on Mobile / Centered Dialog on Desktop */}
      <motion.div
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="relative z-10 w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Mobile Pull/Drag Indicator */}
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

        {/* Fixed Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-800/80 bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                form.type === "Income"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {form.type === "Income" ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">Edit Transaction</h3>
              <p className="text-[11px] text-slate-400">Modify details or delete entry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 space-y-3.5 overflow-y-auto no-scrollbar flex-1">
            {/* Type Radio Switcher */}
            <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleTypeChange("Income")}
                className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  form.type === "Income"
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ArrowUpRight size={14} />
                <span>Income</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("Expense")}
                className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  form.type === "Expense"
                    ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ArrowDownRight size={14} />
                <span>Expense</span>
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Amount (Rs.)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                  Rs.
                </span>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-white font-mono font-bold text-base focus:outline-none focus:border-emerald-500/80 transition-colors"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Category ({form.type})
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500/80 transition-colors"
              >
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => {
                  const isSelected = form.paymentMethod === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, paymentMethod: m.id }))}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-slate-800 border-sky-500 text-white font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon size={14} className={isSelected ? "text-sky-400" : "text-slate-500"} />
                      <span className="truncate">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar size={12} />
                  <span>Date</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500/80 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Clock size={12} />
                  <span>Time</span>
                </label>
                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500/80 transition-colors"
                />
              </div>
            </div>

            {/* Note / Description */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                Note / Description (Optional)
              </label>
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Add details, shop name, note..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500/80 transition-colors"
              />
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="px-4 py-3 border-t border-slate-800/80 bg-slate-900 shrink-0">
            {showDeleteConfirm ? (
              <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/50 space-y-2">
                <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                  <AlertTriangle size={14} />
                  <span>Delete this transaction?</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1"
                  >
                    {isDeleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3.5 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors flex items-center justify-center gap-1.5 text-xs font-bold shrink-0"
                  title="Delete transaction"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                >
                  <Check size={15} />
                  <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            )}
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
