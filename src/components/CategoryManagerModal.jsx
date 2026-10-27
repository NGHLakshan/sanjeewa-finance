import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Trash2, PlusCircle, Check, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import { addCategory, updateCategory, deleteCategory, seedDefaultCategories, DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from "../services/categories";
import toast from "react-hot-toast";

export default function CategoryManagerModal({ categories = [], onClose }) {
  const [activeTab, setActiveTab] = useState("Expense"); // "Expense" or "Income"
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCategories = categories.filter((c) => c.type === activeTab);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (currentCategories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("A category with this name already exists!");
      return;
    }

    setIsSubmitting(true);
    try {
      await addCategory(trimmed, activeTab);
      setNewCatName("");
      toast.success(`${trimmed} added to ${activeTab} categories!`);
    } catch (err) {
      console.error("Error adding category:", err);
      toast.error("Failed to add category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (id) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    try {
      await updateCategory(id, { name: trimmed });
      setEditingId(null);
      setEditingName("");
      toast.success("Category updated!");
    } catch (err) {
      console.error("Error updating category:", err);
      toast.error("Failed to update category.");
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      toast.success("Category removed!");
    } catch (err) {
      console.error("Error deleting category:", err);
      toast.error("Failed to delete category.");
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Restore default personal categories? Existing ones will remain.")) return;
    try {
      await seedDefaultCategories();
      toast.success("Default categories restored!");
    } catch (err) {
      toast.error("Failed to restore defaults.");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Dimmed backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="relative z-10 w-full max-w-lg bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Mobile Pull Indicator */}
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">Manage Categories</h3>
            <p className="text-xs text-slate-400">Configure your personal Income & Expense categories</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher: Expense vs Income */}
        <div className="px-5 pt-3 shrink-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setActiveTab("Expense"); setEditingId(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === "Expense"
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingDown size={15} />
              <span>Expense Categories ({categories.filter(c => c.type === "Expense").length})</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("Income"); setEditingId(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                activeTab === "Income"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp size={15} />
              <span>Income Sources ({categories.filter(c => c.type === "Income").length})</span>
            </button>
          </div>
        </div>

        {/* Add Category Form */}
        <div className="px-5 py-3 shrink-0">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder={`Add new ${activeTab.toLowerCase()} category (e.g. ${
                activeTab === "Income" ? "Side Gig, Bonus..." : "Keells, Insurance, Fuel..."
              })`}
              className="flex-1 form-input text-xs py-2.5 bg-slate-950 border-slate-800"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newCatName.trim()}
              className={`px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 text-white ${
                activeTab === "Income"
                  ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                  : "bg-red-600 hover:bg-red-500 shadow-red-500/20"
              }`}
            >
              <PlusCircle size={15} />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Categories List */}
        <div className="px-5 pb-4 overflow-y-auto flex-1 space-y-2 no-scrollbar">
          {currentCategories.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No {activeTab.toLowerCase()} categories yet. Add one above!
            </div>
          ) : (
            currentCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 group hover:border-slate-700 transition-all"
              >
                {editingId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(cat.id)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-sky-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-slate-400 hover:bg-slate-800 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        cat.type === "Income" ? "bg-emerald-400" : "bg-red-400"
                      }`}
                    />
                    <span className="text-white text-sm font-semibold">{cat.name}</span>
                  </div>
                )}

                {editingId !== cat.id && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}
                      className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit name"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="Delete category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between shrink-0 text-xs">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-slate-400 hover:text-sky-400 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
