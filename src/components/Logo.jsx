import { motion } from "framer-motion";

export default function Logo({ size = "md", className = "", onClick }) {
  const containerClasses = {
    sm: "w-8 h-8 rounded-2xl",
    md: "w-10 h-10 rounded-2xl",
    lg: "w-16 h-16 rounded-3xl",
    xl: "w-20 h-20 rounded-3xl",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`${containerClasses[size] || "w-10 h-10 rounded-2xl"} shrink-0 relative overflow-hidden shadow-lg shadow-emerald-500/25 group ${onClick ? 'cursor-pointer' : ''} ${className}`}
      title={onClick ? "Click to refresh" : "Sanjeewa Finance"}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#022c22" />
            <stop offset="60%" stopColor="#064e3b" />
            <stop offset="100%" stopColor="#021c16" />
          </linearGradient>
          <linearGradient id="logo-s-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <filter id="logo-neon" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 3D Cyber Squircle Base */}
        <rect width="100" height="100" rx="28" fill="url(#logo-bg)" />
        <rect x="2.5" y="2.5" width="95" height="95" rx="25.5" stroke="#10b981" strokeOpacity="0.45" strokeWidth="2.5" />
        <rect x="5" y="5" width="90" height="90" rx="23" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

        {/* Dynamic Glowing Monogram 'S' for Sanjeewa Finance */}
        <path
          d="M68 29 C68 23 60 19 50 19 C38 19 30 25 30 34 C30 45 42 47 52 50 C64 53 71 57 71 66 C71 75 62 81 50 81 C37 81 29 75 29 67"
          stroke="url(#logo-s-grad)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#logo-neon)"
        />

        {/* Financial Upward Growth Trend Crest */}
        <path
          d="M66 19 L77 19 L77 30"
          stroke="#6ee7b7"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Core Shimmer Highlight */}
        <circle cx="50" cy="50" r="2.5" fill="#a7f3d0" />
      </svg>
    </motion.div>
  );
}
