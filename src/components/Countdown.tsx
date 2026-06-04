import { useEffect, useState, type FC } from "react";
import { Clock } from "lucide-react";

/**
 * Live "time left until the tournament ends" pill. Ticks every second and
 * flips to "Ended" once the end date passes. Renders nothing when there is no
 * (valid) end date.
 */
const Countdown: FC<{ end: string | null }> = ({ end }) => {
  const target = end ? new Date(end).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(target)) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (Number.isNaN(target)) return null;

  const diff = target - now;
  if (diff <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 backdrop-blur text-rose-300 bg-rose-500/15 ring-rose-500/30">
        <Clock size={13} /> Ended
      </span>
    );
  }

  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const label = d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 backdrop-blur text-emerald-300 bg-emerald-500/15 ring-emerald-500/30">
      <Clock size={13} /> Ends in {label}
    </span>
  );
};

export default Countdown;
