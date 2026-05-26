import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react";
import { toast } from "react-toastify";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import { useSocket } from "@/context/SocketContext";
import type { GamificationProfile } from "@/types";

interface Segment {
  value: number;
  color: string;
}

/**
 * 8 wedges, 45° each. Order is the visual order around the wheel,
 * starting from the top wedge and going clockwise.
 */
const SEGMENTS: Segment[] = [
  { value: 5,   color: "#ef4444" },
  { value: 10,  color: "#f59e0b" },
  { value: 25,  color: "#10b981" },
  { value: 50,  color: "#3b82f6" },
  { value: 75,  color: "#8b5cf6" },
  { value: 100, color: "#ec4899" },
  { value: 200, color: "#06b6d4" },
  { value: 500, color: "#eab308" },
];

const WEDGE = 360 / SEGMENTS.length; // 45°
const SPIN_TURNS = 5; // full rotations on every spin for drama

const randomGameId = () => `game-${Math.random().toString(36).slice(2, 10)}`;
const newKey = (type: string) =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const Stat: FC<{ label: string; value: string | number; accent?: string }> = ({
  label,
  value,
  accent = "text-indigo-400",
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
    <div className="text-slate-400 text-xs uppercase">{label}</div>
    <div className={`text-xl font-bold mt-1 ${accent}`}>{value}</div>
  </div>
);

const LuckySpinner: FC = () => {
  const [p, setP] = useState<GamificationProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const { on } = useSocket();

  // Game state
  const [pickedIdx, setPickedIdx] = useState<number>(0);
  const [betPlaced, setBetPlaced] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0); // cumulative degrees
  const [landedIdx, setLandedIdx] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<{ landed: number; picked: number; win: boolean } | null>(null);

  const targetIdxRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    const r = await endpoints.profile.get();
    if (r?.success && r.data) setP(r.data);
  }, []);

  useEffect(() => {
    load();
    const off = on("xp:awarded", () => load());
    return off;
  }, [load, on]);

  // Build the conic-gradient string. `from -22.5deg` puts segment 0 centered at top.
  const conic = useMemo(() => {
    const stops = SEGMENTS.map((s, i) => {
      const start = i * WEDGE;
      const end = (i + 1) * WEDGE;
      return `${s.color} ${start}deg ${end}deg`;
    }).join(", ");
    return `conic-gradient(from -${WEDGE / 2}deg, ${stops})`;
  }, []);

  const picked = SEGMENTS[pickedIdx];

  const placeBet = () => {
    if (spinning || busy) return;
    setBetPlaced(true);
    setOutcome(null);
    setLandedIdx(null);
    toast.info(`Bet placed on ${picked.value}. Spin the wheel!`);
  };

  const spin = () => {
    if (busy || spinning || !betPlaced) return;
    const winIdx = Math.floor(Math.random() * SEGMENTS.length);
    targetIdxRef.current = winIdx;

    // Where the picked segment currently sits in screen coordinates.
    const currentDeg = ((rotation % 360) + 360) % 360;
    // We want segment winIdx (center at winIdx*WEDGE in wheel-local coords)
    // to land at the top (0° in screen coords). So target rotation r satisfies:
    //   (winIdx * WEDGE + r) mod 360 === 0
    // i.e. r === -winIdx * WEDGE (mod 360).
    const targetMod = (360 - winIdx * WEDGE) % 360;
    let delta = targetMod - currentDeg;
    if (delta <= 0) delta += 360;
    const next = rotation + SPIN_TURNS * 360 + delta;

    setOutcome(null);
    setLandedIdx(null);
    setSpinning(true);
    setRotation(next);
  };

  const onSpinEnd = async () => {
    if (!spinning) return;
    const winIdx = targetIdxRef.current;
    if (winIdx == null) {
      setSpinning(false);
      return;
    }
    const landed = SEGMENTS[winIdx];
    const win = winIdx === pickedIdx;
    setLandedIdx(winIdx);
    setOutcome({ landed: landed.value, picked: picked.value, win });
    setSpinning(false);

    const winAmount = win ? picked.value : 0;
    if (win) toast.success(`🎉 JACKPOT! Landed on ${landed.value}`);
    else toast.info(`Landed on ${landed.value} — you bet on ${picked.value}.`);

    try {
      setBusy(true);
      const response = await endpoints.activity.record({
        type: "GAME_PLAY",
        gameId: randomGameId(),
        amount: winAmount,
        idempotencyKey: newKey("GAME_PLAY"),
        meta: {
          game: "lucky-spinner",
          name: "Lucky Spinner",
          category: "MT_ORIGINALS",
          provider: "Internal",
          bet: picked.value,
          picked: picked.value,
          landed: landed.value,
          win,
          winAmount,
        },
      });
      if (response?.success) {
        toast.success(`+${response.data?.xpAwarded ?? 0} XP for participating!`);
      }
      await load();
    } catch {
      toast.error("Could not record activity");
    } finally {
      setBetPlaced(false);
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">🎡 Lucky Spinner</h1>
          <p className="text-slate-400 text-sm mt-1">
            Pick an amount, spin the wheel. Land on your pick to win — XP rewards participation.
          </p>
        </div>
        {p && (
          <div className="flex gap-3">
            <Stat label="Total XP" value={p.xpTotal} />
            <Stat label="Level" value={p.level} accent="text-emerald-400" />
            <Stat label="Rank" value={p.rank.name} accent="text-amber-400" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- Wheel --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center">
          <div className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] select-none">
            {/* Pointer */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -top-1 z-20"
              style={{
                width: 0,
                height: 0,
                borderLeft: "14px solid transparent",
                borderRight: "14px solid transparent",
                borderTop: "26px solid #f43f5e",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
              }}
            />

            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full ring-4 ring-slate-800 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)]" />

            {/* Spinning wheel */}
            <div
              className="absolute inset-2 rounded-full"
              style={{
                background: conic,
                transform: `rotate(${rotation}deg)`,
                transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.32, 1.01)" : "none",
              }}
              onTransitionEnd={onSpinEnd}
            >
              {/* Labels: position each at the center of its wedge */}
              {SEGMENTS.map((s, i) => {
                const angle = i * WEDGE; // 0° is segment 0 center (top)
                return (
                  <div
                    key={i}
                    className="absolute left-1/2 top-1/2 text-white font-bold text-lg drop-shadow"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-38%) rotate(${-angle}deg)`,
                    }}
                  >
                    {s.value}
                  </div>
                );
              })}

              {/* Wedge separators */}
              {SEGMENTS.map((_, i) => (
                <div
                  key={`sep-${i}`}
                  className="absolute left-1/2 top-1/2 origin-top bg-slate-900/40"
                  style={{
                    width: 2,
                    height: "50%",
                    transform: `translate(-50%, 0) rotate(${i * WEDGE + WEDGE / 2}deg)`,
                    transformOrigin: "top center",
                  }}
                />
              ))}
            </div>

            {/* Hub */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-slate-950 border-4 border-slate-700 flex items-center justify-center z-10">
              <span className="text-xs text-slate-400 font-semibold">LUCKY</span>
            </div>
          </div>

          {outcome && (
            <div
              className={`mt-6 text-center px-4 py-3 rounded-lg w-full ${
                outcome.win
                  ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
              }`}
            >
              {outcome.win ? (
                <>
                  🎉 <b>JACKPOT!</b> The wheel stopped on <b>{outcome.landed}</b> — your pick!
                </>
              ) : (
                <>
                  Stopped on <b>{outcome.landed}</b> · you picked <b>{outcome.picked}</b>
                </>
              )}
            </div>
          )}
        </div>

        {/* --- Controls --- */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Pick your number</h2>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {SEGMENTS.map((s, i) => {
              const isPicked = i === pickedIdx;
              const isLanded = landedIdx === i;
              return (
                <button
                  key={s.value}
                  disabled={spinning || busy || betPlaced}
                  onClick={() => setPickedIdx(i)}
                  className={`relative px-3 py-3 rounded-lg text-sm font-bold border transition-all disabled:opacity-50 ${
                    isPicked
                      ? "ring-2 ring-indigo-400 border-indigo-400 scale-105"
                      : "border-slate-700 hover:border-slate-500"
                  } ${isLanded && outcome?.win ? "animate-pulse" : ""}`}
                  style={{
                    backgroundColor: isPicked ? s.color : `${s.color}33`,
                    color: isPicked ? "white" : s.color,
                  }}
                >
                  {s.value}
                </button>
              );
            })}
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Your pick</span>
              <span
                className="font-bold text-lg"
                style={{ color: picked.color }}
              >
                {picked.value}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-slate-400">Win payout</span>
              <span className="font-bold text-emerald-400">
                {picked.value} (only if it lands)
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-slate-400">Odds</span>
              <span className="text-slate-300">1 in {SEGMENTS.length}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy || spinning || betPlaced}
              onClick={placeBet}
              className="flex-1 bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-lg font-medium disabled:opacity-60"
            >
              {betPlaced ? `✓ Bet placed (${picked.value})` : `🎲 Place a bet (${picked.value})`}
            </button>
            <button
              disabled={busy || spinning || !betPlaced}
              onClick={spin}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 px-5 py-3 rounded-lg font-medium disabled:opacity-60"
              title={!betPlaced ? "Place a bet first" : undefined}
            >
              {spinning ? "🌀 Spinning…" : "▶ Spin"}
            </button>
          </div>

          {p && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Level {p.progress.level} progress</span>
                <span>
                  {p.progress.xpIntoLevel} / {p.progress.nextLevelXp ?? "max"} XP
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${p.progress.progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LuckySpinner;
