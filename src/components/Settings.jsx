import { useState, useEffect } from "react";
import { subscribeToCategories, addCategory } from "../services/categories";
import { PlusCircle, Settings2, ChevronRight, TrendingUp, TrendingDown, KeyRound, Shield, Download, FileText, Layers, LogOut } from "lucide-react";
import { exportToCSV } from "../utils/export";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import CategoryManagerModal from "./CategoryManagerModal";
import PinLock from "./PinLock";
import { registerModal } from "../utils/modalHistory";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function Settings({ transactions }) {
  const [categories, setCategories] = useState([]);
  const [exportMonth, setExportMonth] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  
  // PIN Lock states
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinMode, setPinMode] = useState("setup"); // 'setup' or 'remove'

  // Register modals so back button closes them
  useEffect(() => {
    if (showCategoryManager) {
      return registerModal(() => setShowCategoryManager(false));
    }
  }, [showCategoryManager]);

  useEffect(() => {
    if (showPinSetup) {
      return registerModal(() => setShowPinSetup(false));
    }
  }, [showPinSetup]);

  useEffect(() => {
    const unsub = subscribeToCategories((data) => {
      setCategories(data);
      setLoading(false);
    });
    
    // Check initial PIN state
    const savedPin = localStorage.getItem("app_pin");
    setIsPinEnabled(!!savedPin);

    return unsub;
  }, []);

  const handleLogout = async () => {
    if (!window.confirm("Do you want to log out of Sanjeewa's Finance Book?")) return;
    try {
      localStorage.removeItem("biz_has_user");
      await signOut(auth);
      toast.success("Logged out successfully");
      window.location.reload();
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  const incomeCategories = categories.filter((c) => c.type === "Income");
  const expenseCategories = categories.filter((c) => c.type === "Expense");

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings2 size={22} className="text-emerald-400" />
          Settings
        </h2>
        <p className="text-slate-400 text-sm mt-1">Configure categories, security and data backup.</p>
      </div>

      {/* Category Management */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Categories</h3>
          </div>
          <button
            onClick={() => setShowCategoryManager(true)}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
          >
            <span>Manage</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            onClick={() => setShowCategoryManager(true)}
            className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1">
              <TrendingUp size={14} />
              <span>Income Sources</span>
            </div>
            <p className="text-2xl font-bold text-white">{incomeCategories.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Salary, freelance, etc.</p>
          </div>

          <div
            onClick={() => setShowCategoryManager(true)}
            className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-red-500/40 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1">
              <TrendingDown size={14} />
              <span>Expense Categories</span>
            </div>
            <p className="text-2xl font-bold text-white">{expenseCategories.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Food, fuel, bills, etc.</p>
          </div>
        </div>

        <button
          onClick={() => setShowCategoryManager(true)}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          <PlusCircle size={15} className="text-emerald-400" />
          <span>Add or Edit Personal Categories</span>
        </button>
      </div>

      {/* Security Settings */}
      <div className="glass-card p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Security</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
            <div>
              <span className="text-white text-sm font-semibold block">App PIN Lock</span>
              <span className="text-slate-400 text-xs block mt-0.5">Require 4-digit PIN on startup</span>
            </div>
            
            <button
              onClick={() => {
                if (isPinEnabled) {
                  setPinMode("remove");
                  setShowPinSetup(true);
                } else {
                  setPinMode("setup");
                  setShowPinSetup(true);
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isPinEnabled ? "bg-emerald-500 shadow-lg shadow-emerald-500/25" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPinEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Change PIN button when enabled */}
          {isPinEnabled && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div>
                <span className="text-white text-sm font-semibold block">Change PIN</span>
                <span className="text-slate-400 text-xs block mt-0.5">Update your 4-digit security PIN</span>
              </div>
              <button
                onClick={() => {
                  setPinMode("change");
                  setShowPinSetup(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5"
              >
                <KeyRound size={13} className="text-emerald-400" />
                Change
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Data Management Settings */}
      <div className="glass-card p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Data Management</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
            <div>
              <span className="text-white text-sm font-semibold block">Export to CSV</span>
              <span className="text-slate-400 text-xs block mt-0.5">Download your transactions to open in Excel</span>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs px-2 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-emerald-500/50"
              >
                <option value="all">All Time</option>
                {transactions && [...new Set(transactions.map(t => {
                  const d = new Date(t.date);
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                }))].sort().reverse().map(ym => (
                  <option key={ym} value={ym}>
                    {new Date(`${ym}-01`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </option>
                ))}
              </select>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const success = exportToCSV(transactions, exportMonth);
                  if (success) {
                    toast.success("Export successful!");
                  } else {
                    toast.error("No data found to export.");
                  }
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 shrink-0"
              >
                <Download size={14} />
                Export
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Account / Logout */}
      <div className="glass-card p-5 mt-6 border-red-500/20">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-white text-sm font-semibold block">Account Session</span>
            <span className="text-slate-400 text-xs block mt-0.5">Sign out of this device</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Category Manager Modal */}
      <AnimatePresence>
        {showCategoryManager && (
          <CategoryManagerModal
            categories={categories}
            onClose={() => setShowCategoryManager(false)}
          />
        )}
      </AnimatePresence>

      {/* Pin Setup/Remove/Change Modal */}
      <AnimatePresence>
        {showPinSetup && (
          <PinLock 
            mode={pinMode}
            onSuccess={() => {
              setIsPinEnabled(!!localStorage.getItem("app_pin"));
              setShowPinSetup(false);
            }}
            onClose={() => setShowPinSetup(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
