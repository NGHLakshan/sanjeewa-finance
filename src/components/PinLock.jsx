import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Delete, X, Fingerprint } from "lucide-react";
import toast from "react-hot-toast";
import Logo from "./Logo";
import {
  isBiometricAvailable,
  isBiometricRegistered,
  registerBiometric,
  verifyBiometric,
} from "../utils/biometric";

const PIN_LENGTH = 4;

// mode: "verify" | "setup" | "remove" | "change"
export default function PinLock({ mode = "verify", onSuccess, onClose }) {
  const [pin, setPin] = useState("");
  const [setupStep, setSetupStep] = useState(1);
  const [firstPin, setFirstPin] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  // For "change" mode: step 1=verify old, step 2=enter new, step 3=confirm new
  const [changeStep, setChangeStep] = useState(1);

  // Biometric state
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  const shakeVariants = {
    shake: { x: [-10, 10, -10, 10, -5, 5, 0], transition: { duration: 0.4 } },
    normal: { x: 0 },
  };

  // Check biometric availability on mount
  useEffect(() => {
    isBiometricAvailable().then((avail) => {
      setBioAvailable(avail);
      setBioRegistered(isBiometricRegistered());
    });
  }, []);

  // Auto-trigger fingerprint on verify mode if already registered
  useEffect(() => {
    if (mode === "verify" && bioAvailable && bioRegistered) {
      // Small delay so the screen has time to render
      const timer = setTimeout(() => handleBiometricVerify(), 600);
      return () => clearTimeout(timer);
    }
  }, [mode, bioAvailable, bioRegistered]);

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      handlePinComplete(pin);
    }
  }, [pin]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isError || isSuccess) return;
      if (/^[0-9]$/.test(e.key)) {
        if (pin.length < PIN_LENGTH) {
          setPin((prev) => prev + e.key);
        }
      } else if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === "Escape" && onClose && mode !== "verify") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isError, pin, onClose, mode]);

  // ---------- Biometric handlers ----------

  const handleBiometricVerify = useCallback(async () => {
    if (bioLoading) return;
    setBioLoading(true);
    try {
      const success = await verifyBiometric();
      if (success) {
        triggerSuccess(onSuccess);
      } else {
        toast.error("Fingerprint not recognised. Use your PIN.");
      }
    } catch {
      toast.error("Biometric verification failed. Use your PIN.");
    } finally {
      setBioLoading(false);
    }
  }, [bioLoading, onSuccess]);

  const handleBiometricEnroll = async () => {
    if (bioLoading) return;
    setBioLoading(true);
    const toastId = toast.loading("Setting up fingerprint…");
    try {
      const success = await registerBiometric();
      if (success) {
        setBioRegistered(true);
        toast.success("Fingerprint enrolled! You can now unlock with your fingerprint.", { id: toastId });
      } else {
        toast.error("Fingerprint setup cancelled or failed.", { id: toastId });
      }
    } catch {
      toast.error("Fingerprint setup failed.", { id: toastId });
    } finally {
      setBioLoading(false);
    }
  };

  // ---------- PIN handlers ----------

  const handlePinComplete = (enteredPin) => {
    if (mode === "verify") {
      const savedPin = localStorage.getItem("app_pin");
      if (enteredPin === savedPin) {
        triggerSuccess(onSuccess);
      } else {
        triggerError("Incorrect PIN");
      }

    } else if (mode === "setup") {
      if (setupStep === 1) {
        setFirstPin(enteredPin);
        setPin("");
        setSetupStep(2);
      } else {
        if (enteredPin === firstPin) {
          localStorage.setItem("app_pin", enteredPin);
          toast.success("PIN set successfully!");
          onSuccess();
        } else {
          toast.error("PINs do not match. Try again.");
          setSetupStep(1);
          setFirstPin("");
          triggerError();
        }
      }

    } else if (mode === "remove") {
      const savedPin = localStorage.getItem("app_pin");
      if (enteredPin === savedPin) {
        localStorage.removeItem("app_pin");
        toast.success("PIN removed!");
        onSuccess();
      } else {
        triggerError("Incorrect PIN");
      }

    } else if (mode === "change") {
      if (changeStep === 1) {
        // Verify current PIN
        const savedPin = localStorage.getItem("app_pin");
        if (enteredPin === savedPin) {
          setPin("");
          setChangeStep(2);
        } else {
          triggerError("Incorrect current PIN");
        }
      } else if (changeStep === 2) {
        // Enter new PIN
        setFirstPin(enteredPin);
        setPin("");
        setChangeStep(3);
      } else {
        // Confirm new PIN
        if (enteredPin === firstPin) {
          localStorage.setItem("app_pin", enteredPin);
          toast.success("PIN changed successfully!");
          onSuccess();
        } else {
          toast.error("PINs do not match. Try again.");
          setChangeStep(2);
          setFirstPin("");
          triggerError();
        }
      }
    }
  };

  const triggerSuccess = (callback) => {
    setIsSuccess(true);
    setTimeout(() => {
      callback();
    }, 350);
  };

  const triggerError = (msg) => {
    if (msg) toast.error(msg);
    setIsError(true);
    setTimeout(() => {
      setIsError(false);
      setPin("");
    }, 500);
  };

  const handleNumberPress = (num) => {
    if (pin.length < PIN_LENGTH) {
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const getTitleText = () => {
    if (mode === "verify") return "Enter PIN";
    if (mode === "remove") return "Enter current PIN to disable";
    if (mode === "change") {
      if (changeStep === 1) return "Enter current PIN";
      if (changeStep === 2) return "Enter new PIN";
      return "Confirm new PIN";
    }
    // setup
    return setupStep === 1 ? "Create new PIN" : "Confirm new PIN";
  };

  const getSubtitleText = () => {
    if (mode === "verify") return "Unlock Sanjeewa's Finance Book";
    if (mode === "change") {
      if (changeStep === 1) return "Verify your identity first";
      if (changeStep === 2) return "Choose a new 4-digit PIN";
      return "Re-enter the new PIN";
    }
    return "Keep your data secure";
  };

  const getStepIndicator = () => {
    if (mode === "change") return `Step ${changeStep} of 3`;
    if (mode === "setup") return `Step ${setupStep} of 2`;
    return null;
  };

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < PIN_LENGTH; i++) {
      dots.push(
        <motion.div
          key={i}
          initial={false}
          animate={{
            scale: isSuccess ? 1.4 : i < pin.length ? 1.2 : 1,
            backgroundColor: isSuccess ? "#34d399" : i < pin.length ? "#10b981" : "#334155",
            borderColor: isSuccess ? "#34d399" : i < pin.length ? "#10b981" : "#475569",
            boxShadow: isSuccess ? "0 0 12px 4px rgba(52,211,153,0.5)" : "none",
          }}
          transition={{ duration: 0.2, delay: isSuccess ? i * 0.05 : 0 }}
          className="w-4 h-4 rounded-full border-2 mx-2"
        />
      );
    }
    return dots;
  };

  const stepIndicator = getStepIndicator();

  // Show enroll prompt after PIN verified in setup mode's step 1 completion
  // (we let the Settings page handle enroll separately via the button below)

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-8 pb-32">

        {/* Close button (not for verify mode) */}
        {onClose && mode !== "verify" && (
          <button
            onClick={onClose}
            className="fixed top-6 right-6 w-10 h-10 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-6">
          <Logo size="md" className="mx-auto mb-3 shadow-emerald-500/20 shadow-lg" />
          <h2 className="text-xl font-bold text-white mb-1">{getTitleText()}</h2>
          <p className="text-slate-400 text-sm">{getSubtitleText()}</p>
          {stepIndicator && (
            <span className="mt-2 inline-block text-[11px] font-semibold bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
              {stepIndicator}
            </span>
          )}
        </div>

        {/* PIN Dots */}
        <motion.div
          variants={shakeVariants}
          animate={isError ? "shake" : "normal"}
          className="flex items-center justify-center mb-8 h-8"
        >
          {renderDots()}
        </motion.div>

        {/* Keypad — standard 3-column phone layout */}
        <div
          className="grid gap-3 w-full"
          style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: '280px' }}
        >
          {/* Digits 1–9 */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <motion.button
              key={num}
              whileTap={{ scale: 0.85 }}
              onClick={() => handleNumberPress(num.toString())}
              className="rounded-full text-white font-semibold flex items-center justify-center hover:bg-slate-700/40 active:bg-slate-600/60 transition-colors"
              style={{ aspectRatio: '1 / 1', fontSize: '1.35rem' }}
            >
              {num}
            </motion.button>
          ))}

          {/* Bottom row: fingerprint | 0 | delete */}
          {/* Fingerprint button (only in verify mode and biometric is registered) */}
          <div className="flex items-center justify-center" style={{ aspectRatio: '1 / 1' }}>
            <AnimatePresence>
              {mode === "verify" && bioAvailable && bioRegistered && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={handleBiometricVerify}
                  disabled={bioLoading}
                  title="Unlock with fingerprint"
                  className="relative w-14 h-14 rounded-full flex items-center justify-center text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 active:bg-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <Fingerprint size={28} />
                  {/* Pulse ring when loading */}
                  {bioLoading && (
                    <span className="absolute inset-0 rounded-full border-2 border-emerald-400/60 animate-ping" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => handleNumberPress('0')}
            className="rounded-full text-white font-semibold flex items-center justify-center hover:bg-slate-700/40 active:bg-slate-600/60 transition-colors"
            style={{ aspectRatio: '1 / 1', fontSize: '1.35rem' }}
          >
            0
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleDelete}
            className="rounded-full text-slate-400 flex items-center justify-center hover:text-white hover:bg-slate-700/40 active:bg-slate-600/60 transition-colors"
            style={{ aspectRatio: '1 / 1' }}
          >
            <Delete size={22} />
          </motion.button>
        </div>

        {/* Enroll fingerprint prompt — only in verify mode, bio available, not yet registered */}
        {mode === "verify" && bioAvailable && !bioRegistered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex flex-col items-center gap-2"
          >
            <p className="text-slate-500 text-xs text-center">
              Speed up login with your fingerprint
            </p>
            <button
              onClick={async () => {
                // First verify PIN is correct, then enroll
                if (pin.length < PIN_LENGTH) {
                  toast("Enter your PIN first, then we'll set up fingerprint.", { icon: "🔐" });
                  return;
                }
                const savedPin = localStorage.getItem("app_pin");
                if (pin === savedPin) {
                  await handleBiometricEnroll();
                  if (isBiometricRegistered()) {
                    triggerSuccess(onSuccess);
                  }
                } else {
                  triggerError("Incorrect PIN");
                }
              }}
              disabled={bioLoading}
              className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-semibold px-4 py-2 rounded-xl border border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all"
            >
              <Fingerprint size={16} />
              Set up Fingerprint
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
