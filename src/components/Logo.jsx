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
      className={`${containerClasses[size] || "w-10 h-10 rounded-2xl"} shrink-0 relative overflow-hidden shadow-xl shadow-emerald-500/30 group ${onClick ? 'cursor-pointer' : ''} ${className}`}
      title={onClick ? "Click to refresh" : "Sanjeewa Finance"}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          {/* Background Luxury Dark Emerald & Obsidian Gradient */}
          <radialGradient id="pro-bg" cx="50%" cy="20%" r="90%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="45%" stopColor="#022c22" />
            <stop offset="85%" stopColor="#030c0a" />
            <stop offset="100%" stopColor="#010605" />
          </radialGradient>

          {/* Outer Bevel Glow */}
          <linearGradient id="pro-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
            <stop offset="35%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#047857" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.6" />
          </linearGradient>

          {/* Top Rim Specular Studio Light */}
          <linearGradient id="pro-specular" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Upper Ribbon Gradient (Mint to Vivid Emerald) */}
          <linearGradient id="ribbon-top" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="40%" stopColor="#34d399" />
            <stop offset="80%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Lower Ribbon Gradient (Emerald to Electric Cyan) */}
          <linearGradient id="ribbon-bot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          {/* 3D Ribbon Shadow (Ambient Occlusion) */}
          <linearGradient id="ribbon-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#011f18" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#011f18" stopOpacity="0" />
          </linearGradient>

          {/* Golden/Mint Shimmer Accent */}
          <linearGradient id="gold-shimmer" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Neon Glow Filter */}
          <filter id="pro-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Outer 3D Squircle Base */}
        <rect width="120" height="120" rx="34" fill="url(#pro-bg)" />
        <rect x="2" y="2" width="116" height="116" rx="32" stroke="url(#pro-border)" strokeWidth="2.5" />
        <rect x="4" y="4" width="112" height="56" rx="30" fill="url(#pro-specular)" />

        {/* Ambient Glow behind S */}
        <g filter="url(#pro-glow)" opacity="0.6">
          <path
            d="M78 36 C78 25 68 20 54 20 C38 20 28 28 28 40 C28 53 44 56 58 59 C72 62 80 67 80 78 C80 91 68 98 52 98 C36 98 26 90 26 80"
            stroke="#10b981"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Layer 2: Main Bottom Ribbon of S (Emerald to Cyan with 3D Bevel) */}
        <path
          d="M48 57 C64 60 78 65 78 77 C78 88 68 94 54 94 C40 94 30 87 30 79"
          stroke="url(#ribbon-bot)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Layer 3: Overlapping Shadow where Top Fold crosses */}
        <ellipse cx="50" cy="56" rx="14" ry="7" fill="url(#ribbon-shadow)" transform="rotate(-15 50 56)" />

        {/* Layer 4: Upper Ribbon of S (Electric Mint with Top Specular Peak) */}
        <path
          d="M78 37 C78 26 68 22 54 22 C40 22 30 29 30 40 C30 52 44 55 58 58"
          stroke="url(#ribbon-top)"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Layer 5: Inner 3D Light Streak along the S flow */}
        <path
          d="M72 32 C70 27 63 24 54 24 C43 24 34 29 34 38 C34 47 45 50 56 53"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.65"
        />

        <path
          d="M52 61 C64 64 74 68 74 76 C74 83 67 89 54 89 C43 89 36 84 34 79"
          stroke="#a7f3d0"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.5"
        />

        {/* Layer 6: Dynamic Fintech Growth Arrow Crest at top-right */}
        <g transform="translate(1, -1)">
          <path
            d="M74 21 L89 21 C90.5 21 91 22.5 90 23.5 L82 31.5 C81 32.5 79.5 32 79.5 30.5 L79.5 24 L74 24 C72.5 24 72.5 21 74 21 Z"
            fill="url(#gold-shimmer)"
            filter="drop-shadow(0 2px 6px rgba(16,185,129,0.7))"
          />
        </g>

        {/* Layer 7: Diamond Shimmer Core at center fold */}
        <path
          d="M57 58.5 L60 55 L63 58.5 L60 62 Z"
          fill="#ffffff"
          filter="drop-shadow(0 0 4px #34d399)"
        />
      </svg>
    </motion.div>
  );
}
