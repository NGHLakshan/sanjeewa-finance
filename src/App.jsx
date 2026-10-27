import { useState, useEffect } from "react";
import { PlusCircle, LayoutDashboard, Settings2, Lock, BarChart2, Wallet, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import TransactionForm from "./components/TransactionForm";
import Dashboard from "./components/Dashboard";
import OfflineBanner from "./components/OfflineBanner";
import Settings from "./components/Settings";
import PinLock from "./components/PinLock";
import SummaryView from "./components/SummaryView";
import Logo from "./components/Logo";
import Login from "./components/Login";
import { subscribeToTransactions } from "./services/transactions";
import { handleModalPopState } from "./utils/modalHistory";

const TABS = [
  { id: "dashboard", label: "Dashboard",  Icon: LayoutDashboard },
  { id: "form",      label: "Add Entry",  Icon: PlusCircle },
  { id: "summary",   label: "Summary",    Icon: BarChart2 },
  { id: "settings",  label: "Settings",   Icon: Settings2 },
];

export default function App({ onReady }) {
  const [tab, setTab] = useState("dashboard");
  const [isLocked, setIsLocked] = useState(() => !!localStorage.getItem("app_pin"));
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(() => auth.currentUser);
  const [authChecking, setAuthChecking] = useState(() => {
    if (auth.currentUser) return false;
    return !!localStorage.getItem("biz_has_user");
  });
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  // Connection status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Initialize history state on mount
  useEffect(() => {
    window.history.replaceState({ tab: "dashboard" }, "");
  }, []);

  const executeTabChange = (newTab) => {
    if (newTab === "dashboard") {
      if (tab !== "dashboard") {
        window.history.replaceState({ tab: "dashboard" }, "");
      }
    } else {
      if (tab === "dashboard") {
        window.history.pushState({ tab: newTab }, "");
      } else {
        window.history.replaceState({ tab: newTab }, "");
      }
    }
    setTab(newTab);
  };

  const handleTabChange = (newTab) => {
    if (tab === newTab) return;
    if (tab === "form" && isFormDirty) {
      setPendingTab(newTab);
      setShowDiscardConfirm(true);
      return;
    }
    executeTabChange(newTab);
  };

  // Back button (popstate) listener
  useEffect(() => {
    const handlePopState = () => {
      // 1. If any modal is open, close topmost modal and stay on current page
      if (handleModalPopState()) {
        return;
      }

      // 2. If on Form and form has unsaved data, prompt confirmation
      if (tab === "form" && isFormDirty) {
        window.history.pushState({ tab: "form" }, "");
        setPendingTab("dashboard");
        setShowDiscardConfirm(true);
        return;
      }

      // 3. If on any non-dashboard tab, go back to Dashboard
      if (tab !== "dashboard") {
        setTab("dashboard");
        window.history.replaceState({ tab: "dashboard" }, "");
        return;
      }

      // 4. If on Dashboard and no modals: user backed out, browser exits naturally
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [tab, isFormDirty]);

  // Hide the HTML splash screen as soon as React is mounted and ready to render
  useEffect(() => { onReady?.(); }, []);

  useEffect(() => {
    let initialCheckDone = false;
    const hadSavedUser = !!localStorage.getItem("biz_has_user");

    const finishInitialCheck = (currentUser) => {
      if (initialCheckDone) return;
      initialCheckDone = true;
      if (currentUser) {
        localStorage.setItem("biz_has_user", "true");
        setUser(currentUser);
      } else {
        localStorage.removeItem("biz_has_user");
        setUser(null);
      }
      setAuthChecking(false);
    };

    // 1. If auth.currentUser is already available synchronously
    if (auth.currentUser) {
      finishInitialCheck(auth.currentUser);
    }

    // 2. Listen to ongoing auth state changes (login, logout, token refresh).
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        localStorage.setItem("biz_has_user", "true");
        setUser(currentUser);
        setAuthChecking(false);
      } else {
        if (initialCheckDone) {
          localStorage.removeItem("biz_has_user");
          setUser(null);
        }
      }
      finishInitialCheck(currentUser);
    });

    // 3. authStateReady resolves when IndexedDB local persistence is read
    if (typeof auth.authStateReady === "function") {
      auth.authStateReady().then(() => {
        finishInitialCheck(auth.currentUser);
      }).catch(() => {
        finishInitialCheck(auth.currentUser);
      });
    }

    // 4. Safety Fallback:
    // Give IndexedDB 4.5s if device had a known user, 400ms if fresh visitor
    const timeoutMs = hadSavedUser ? 4500 : 400;
    const fallbackTimer = setTimeout(() => {
      finishInitialCheck(auth.currentUser);
    }, timeoutMs);

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribeAuth();
    };
  }, []);

  // Only subscribe to data when user is authenticated
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToTransactions((data) => setTransactions(data));
    return unsub;
  }, [user]);

  // PIN Lock must be checked FIRST — before auth — so the user always
  // sees the PIN screen when the app is reopened after being killed/refreshed.
  if (isLocked) {
    return (
      <>
        <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', borderRadius: '16px', border: '1px solid #334155' } }} />
        <PinLock
          mode="verify"
          onSuccess={() => setIsLocked(false)}
        />
      </>
    );
  }

  // Show loading spinner while restoring Firebase session — NEVER flash the Login screen.
  const hadSavedUser = !!localStorage.getItem("biz_has_user");
  if (authChecking || (!user && hadSavedUser)) {
    return (
      <div className="h-[100dvh] w-screen bg-slate-950 flex flex-col items-center justify-center">
        <Logo size="lg" className="animate-pulse mb-6 opacity-50" />
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show Login screen only if truly not authenticated and no saved session exists
  if (!user) {
    return (
      <>
        <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', borderRadius: '16px', border: '1px solid #334155' } }} />
        <Login onLoginSuccess={(loggedInUser) => {
          if (loggedInUser) {
            localStorage.setItem("biz_has_user", "true");
            setUser(loggedInUser);
          }
        }} />
      </>
    );
  }

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 flex flex-col overflow-hidden relative">
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Toaster for premium notifications */}
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '16px',
            border: '1px solid #334155',
            backdropFilter: 'blur(12px)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel px-4 py-3 border-b border-slate-800/50">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Logo size="md" onClick={() => window.location.reload()} />
          <div className="flex-1">
            <h1 className="font-bold text-base leading-none tracking-tight gradient-text from-emerald-400 to-sky-400 pb-1">
              Sanjeewa
            </h1>
            <p className="text-slate-400 text-xs font-medium">Personal Finance &amp; Expense Tracker</p>
          </div>
          {/* Online / Offline indicator */}
          <div
            id="connection-indicator"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${
              isOnline
                ? "bg-slate-800/50 border-slate-700/50"
                : "bg-amber-500/10 border-amber-500/30"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline
                  ? "bg-emerald-400 animate-pulse glow-emerald"
                  : "bg-amber-400"
              }`}
            />
            <span className={`text-xs hidden sm:inline font-medium ${isOnline ? "text-slate-400" : "text-amber-400"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          {/* Quick Lock Button if PIN is set */}
          {localStorage.getItem("app_pin") && (
            <button
              onClick={() => setIsLocked(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/50 hover:bg-slate-700/70 border border-slate-700/50 text-slate-400 hover:text-emerald-400 transition-all"
              title="Lock App"
            >
              <Lock size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Offline Banner */}
      <OfflineBanner />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10">
        <div className="h-full w-full overflow-y-auto pb-24" id="main-scroller">
          {tab === "form" ? (
            <TransactionForm onDirtyChange={setIsFormDirty} />
          ) : tab === "settings" ? (
            <Settings transactions={transactions} />
          ) : tab === "summary" ? (
            <SummaryView transactions={transactions} />
          ) : (
            <Dashboard 
              onNewEntry={() => handleTabChange("form")} 
              transactions={transactions}
              initialTransactions={transactions}
            />
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-800/50 pb-safe">
        <div className="max-w-lg mx-auto flex p-1">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                id={`nav-${id}`}
                onClick={() => handleTabChange(id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl transition-all relative outline-none ${
                  active ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {/* Active Background Glow */}
                {active && (
                  <motion.div 
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-emerald-500/10 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="relative z-10 flex flex-col items-center gap-1"
                >
                  <Icon
                    size={24}
                    strokeWidth={active ? 2.5 : 1.5}
                    className={active ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : ""}
                  />
                  <span className="text-[11px] font-medium tracking-wide">{label}</span>
                </motion.div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Unsaved Changes Discard Confirmation Dialog */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <AlertTriangle size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">දත්ත ඉවත් වේවි!</h3>
                <p className="text-sm text-slate-300 mt-1">
                  ඔබ ඇතුළත් කළ තොරතුරු Save කර නැත. පිටවීමට අවශ්‍යද?
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    setPendingTab(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm transition-all border border-slate-700"
                >
                  නැත (Cancel)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsFormDirty(false);
                    setShowDiscardConfirm(false);
                    executeTabChange(pendingTab || "dashboard");
                    setPendingTab(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition-all shadow-lg shadow-rose-600/30"
                >
                  ඔව්, පිටවෙන්න
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
