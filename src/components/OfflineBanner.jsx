import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-500/90 backdrop-blur-sm text-white text-xs px-4 py-2.5 flex items-center justify-center gap-2">
      <WifiOff size={13} />
      <span>You're offline — data saves locally and syncs when connected.</span>
    </div>
  );
}
