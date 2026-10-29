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
      className={`${containerClasses[size] || "w-10 h-10 rounded-2xl"} shrink-0 relative overflow-hidden shadow-xl shadow-amber-500/15 group ${onClick ? 'cursor-pointer' : ''} ${className}`}
      title={onClick ? "Click to refresh" : "Sanjeewa Finance"}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          {/* Background luxury obsidian gradient */}
          <radialGradient id="lux-bg" cx="50%" cy="20%" r="85%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="50%" stopColor="#022c22" />
            <stop offset="100%" stopColor="#020806" />
          </radialGradient>

          {/* 24K Gold outer metallic border */}
          <linearGradient id="lux-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>

          {/* Coin face gradient */}
          <radialGradient id="coin-face" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#064e3b" />
            <stop offset="65%" stopColor="#022c22" />
            <stop offset="100%" stopColor="#01140e" />
          </radialGradient>

          {/* S Monogram Gold & Emerald gradient */}
          <linearGradient id="s-lux-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="35%" stopColor="#34d399" />
            <stop offset="70%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Specular highlight */}
          <linearGradient id="lux-spec" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Glow Filter */}
          <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Luxury Squircle Outer Container */}
        <rect width="120" height="120" rx="34" fill="url(#lux-bg)" />
        <rect x="2.5" y="2.5" width="115" height="115" rx="31.5" stroke="url(#lux-gold)" strokeWidth="2.5" strokeOpacity="0.8" />
        <rect x="4.5" y="4.5" width="111" height="55" rx="29.5" fill="url(#lux-spec)" />

        {/* 2. 3D Minted Medallion in Center */}
        {/* Medallion Gold Outer Rim */}
        <circle cx="60" cy="60" r="41" fill="url(#coin-face)" stroke="url(#lux-gold)" strokeWidth="3.5" />
        {/* Inner Emerald Hairline */}
        <circle cx="60" cy="60" r="37" stroke="#10b981" strokeWidth="1.2" strokeOpacity="0.85" />

        {/* 3. Embossed 3D Monogram "S" with Gold/Emerald Sheen */}
        {/* S Relief Shadow */}
        <path
          d="M74 41 C74 33 66 28 55 28 C41 28 32 35 32 46 C32 58 46 61 60 64 C73 67 80 72 80 82 C80 93 69 99 55 99 C39 99 30 92 30 83"
          stroke="#000000"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.65"
          transform="translate(0, 3)"
        />

        {/* S Main Sculpted Body */}
        <path
          d="M74 41 C74 33 66 28 55 28 C41 28 32 35 32 46 C32 58 46 61 60 64 C73 67 80 72 80 82 C80 93 69 99 55 99 C39 99 30 92 30 83"
          stroke="url(#s-lux-grad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#gold-glow)"
        />

        {/* S Specular Spine Highlight */}
        <path
          d="M71 39 C71 35 65 31 55 31 C43 31 36 36 36 44 C36 54 48 58 61 61 C72 64 77 69 77 79 C77 88 67 94 55 94 C42 94 34 88 34 83"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.85"
        />

        {/* 4. Brilliant 4-Point Diamond Sparkles (✦) */}
        {/* Top Right Sparkle */}
        <g transform="translate(88, 30)">
          <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill="#ffffff" />
          <circle cx="0" cy="0" r="1.5" fill="#f59e0b" />
        </g>

        {/* Bottom Left Sparkle */}
        <g transform="translate(32, 90)">
          <path d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" fill="#ffffff" />
        </g>
      </svg>
    </motion.div>
  );
}
