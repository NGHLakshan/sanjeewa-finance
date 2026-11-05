import { motion } from "framer-motion";

export default function Logo({ size = "md", className = "", onClick }) {
  const containerClasses = {
    sm: "w-8 h-8 rounded-full",
    md: "w-10 h-10 rounded-full",
    lg: "w-16 h-16 rounded-full",
    xl: "w-20 h-20 rounded-full",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`${containerClasses[size] || "w-10 h-10 rounded-full"} shrink-0 relative overflow-hidden shadow-lg shadow-emerald-500/20 group ${onClick ? 'cursor-pointer' : ''} ${className}`}
      title={onClick ? "Click to refresh" : "Sanjeewa Finance"}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          {/* Dark navy radial background */}
          <radialGradient id="biz-bg-comp" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#162038" />
            <stop offset="60%" stopColor="#0c1222" />
            <stop offset="100%" stopColor="#070b14" />
          </radialGradient>

          {/* Part 1 Emerald Gradient */}
          <linearGradient id="biz-emerald-comp-1" x1="25%" y1="15%" x2="80%" y2="85%">
            <stop offset="0%" stopColor="#00f59b" />
            <stop offset="40%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Part 2 Emerald Facet Gradient */}
          <linearGradient id="biz-emerald-comp-2" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* High-tech neon glow */}
          <filter id="biz-glow-comp" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#10b981" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* 1. Circular Dark Navy Base */}
        <circle cx="60" cy="60" r="56" fill="url(#biz-bg-comp)" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.3" />

        {/* 2. Part 1: Main Chevron Apex, Left Leg & Crossbar */}
        <path
          d="M60 23.5 L84.5 53.5 L69 53.5 L60 41.5 L46.5 63 L69.5 63 L69.5 76 L38.5 76 L33 95 L19.5 95 Z"
          fill="url(#biz-emerald-comp-1)"
          filter="url(#biz-glow-comp)"
        />

        {/* 3. Part 2: Lower Right Geometric Leg */}
        <polygon
          points="73.5,63 87.5,63 99,95 85,95"
          fill="url(#biz-emerald-comp-2)"
        />
      </svg>
    </motion.div>
  );
}
