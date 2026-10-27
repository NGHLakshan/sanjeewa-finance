import { motion } from "framer-motion";

export default function Logo({ size = "md", className = "", onClick }) {
  const containerClasses = {
    sm: "w-8 h-8 rounded-full",
    md: "w-10 h-10 rounded-full",
    lg: "w-16 h-16 rounded-full",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className={`${containerClasses[size]} shrink-0 relative overflow-hidden rounded-full shadow-lg shadow-emerald-500/20 group ${onClick ? 'cursor-pointer' : ''} ${className}`}
      title={onClick ? "Click to refresh" : "Sanjeewa Finance"}
    >
      <img
        src="/pwa-192x192.png"
        alt="Sanjeewa Finance Logo"
        className="w-full h-full object-cover rounded-full transition-transform duration-200 group-hover:scale-110 select-none pointer-events-none"
      />
    </motion.div>
  );
}
