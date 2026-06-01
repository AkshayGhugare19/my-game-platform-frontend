import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
} from "react";
import { toast } from "react-toastify";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import { useSocket } from "@/context/SocketContext";
import type { GamificationProfile } from "@/types";

const BET_CHIPS = [5, 10, 25, 50, 75];
const GROWTH = 0.00018; // multiplier grows exp with elapsed ms

const randomGameId = () => `aviator-${Math.random().toString(36).slice(2, 10)}`;
const newKey = (type: string) =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Pick the crash multiplier up front (the round is decided the instant it
 * starts; the rising number is just animation). Distribution is heavy near
 * 1.0× and has a long tail, mirroring real crash games.
 */
const pickCrashPoint = (): number => {
  const r = Math.random();
  // ~3% instant bust at 1.00×, otherwise 0.99 / (1 - r) capped for sanity.
  if (r < 0.03) return 1.0;
  const m = 0.99 / (1 - r);
  return Math.min(50, Math.max(1.01, Math.round(m * 100) / 100));
};

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

type Phase = "idle" | "flying" | "crashed" | "cashed";

const Aviator: FC = () => {
  const [p, setP] = useState<GamificationProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const { on } = useSocket();

  const [bet, setBet] = useState(10);
  const [betPlaced, setBetPlaced] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [multiplier, setMultiplier] = useState(1);
  const [outcome, setOutcome] = useState<{
    cashedAt: number | null;
    crashAt: number;
    win: boolean;
    winAmount: number;
  } | null>(null);

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const crashRef = useRef(1);
  const phaseRef = useRef<Phase>("idle"); // mirror for use inside the rAF loop
  const cashedRef = useRef(false);

  const load = useCallback(async () => {
    const r = await endpoints.profile.get();
    if (r?.success && r.data) setP(r.data);
  }, []);

  useEffect(() => {
    load();
    const off = on("xp:awarded", () => load());
    return off;
  }, [load, on]);

  // Always stop the animation frame on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const setPhaseBoth = (ph: Phase) => {
    phaseRef.current = ph;
    setPhase(ph);
  };

  const record = useCallback(
    async (cashedAt: number | null, crashAt: number) => {
      const win = cashedAt != null;
      const winAmount = win ? Math.round(bet * cashedAt) : 0;
      try {
        setBusy(true);
        const response = await endpoints.activity.record({
          type: "GAME_PLAY",
          gameId: randomGameId(),
          amount: winAmount,
          idempotencyKey: newKey("GAME_PLAY"),
          meta: {
            game: "aviator",
            name: "Aviator",
            category: "Crash",
            provider: "SDLC",
            bet,
            cashedAt,
            crashAt,
            win,
            winAmount,
          },
        });
        if (response?.success) {
          toast.success(`+${response.data?.xpAwarded ?? 0} XP for the round!`);
        }
        await load();
      } catch {
        toast.error("Could not record activity");
      } finally {
        setBetPlaced(false);
        setBusy(false);
      }
    },
    [bet, load]
  );

  const finish = useCallback(
    (cashedAt: number | null) => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      const crashAt = crashRef.current;
      const win = cashedAt != null;
      setOutcome({
        cashedAt,
        crashAt,
        win,
        winAmount: win ? Math.round(bet * cashedAt) : 0,
      });
      setPhaseBoth(win ? "cashed" : "crashed");
      if (win) toast.success(`💸 Cashed out at ${cashedAt.toFixed(2)}×!`);
      else toast.info(`💥 Crashed at ${crashAt.toFixed(2)}× — too greedy!`);
      void record(cashedAt, crashAt);
    },
    [bet, record]
  );

  const tick = useCallback(
    (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const elapsed = t - startRef.current;
      const m = Math.max(1, Math.exp(GROWTH * elapsed));
      const rounded = Math.round(m * 100) / 100;

      if (rounded >= crashRef.current) {
        setMultiplier(crashRef.current);
        if (!cashedRef.current) finish(null);
        return;
      }
      setMultiplier(rounded);
      rafRef.current = requestAnimationFrame(tick);
    },
    [finish]
  );

  const placeBet = () => {
    if (phase === "flying" || busy || betPlaced) return;
    setBetPlaced(true);
    setOutcome(null);
    setMultiplier(1);
    setPhaseBoth("idle");
    toast.info(`Bet placed: ${bet}. Take off!`);
  };

  const takeOff = () => {
    if (busy || phase === "flying" || !betPlaced) return;
    crashRef.current = pickCrashPoint();
    startRef.current = null;
    cashedRef.current = false;
    setOutcome(null);
    setMultiplier(1);
    setPhaseBoth("flying");
    rafRef.current = requestAnimationFrame(tick);
  };

  const cashOut = () => {
    if (phaseRef.current !== "flying" || cashedRef.current) return;
    cashedRef.current = true;
    finish(multiplier);
  };

  const flying = phase === "flying";

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">✈️ Aviator</h1>
          <p className="text-slate-400 text-sm mt-1">
            The plane takes off and the multiplier climbs. Cash out before it
            flies away — wait too long and you crash. XP rewards every round.
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {/* Flight display */}
        <div
          className={`relative h-64 rounded-2xl overflow-hidden mb-6 border transition-colors ${
            phase === "crashed"
              ? "bg-rose-950/40 border-rose-900/60"
              : phase === "cashed"
              ? "bg-emerald-950/30 border-emerald-900/60"
              : "bg-slate-950 border-slate-800"
          }`}
        >
          {/* Plane riding the multiplier curve */}
          <div
            className="absolute text-4xl transition-none"
            style={{
              left: `${Math.min(88, (multiplier - 1) * 30 + 4)}%`,
              bottom: `${Math.min(80, (multiplier - 1) * 26 + 6)}%`,
              transform: phase === "crashed" ? "rotate(45deg)" : "rotate(-8deg)",
              opacity: phase === "crashed" ? 0.4 : 1,
            }}
          >
            ✈️
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div
              className={`text-5xl font-black tabular-nums ${
                phase === "crashed"
                  ? "text-rose-400"
                  : phase === "cashed"
                  ? "text-emerald-400"
                  : "text-white"
              }`}
            >
              {multiplier.toFixed(2)}×
            </div>
            {phase === "crashed" && (
              <div className="text-rose-400 font-bold mt-2">💥 Flew away!</div>
            )}
            {phase === "cashed" && outcome && (
              <div className="text-emerald-400 font-bold mt-2">
                💸 +{outcome.winAmount}
              </div>
            )}
            {phase === "idle" && !betPlaced && (
              <div className="text-slate-500 text-sm mt-2">
                Place a bet to play
              </div>
            )}
            {phase === "idle" && betPlaced && (
              <div className="text-slate-400 text-sm mt-2">
                Ready — hit Take off
              </div>
            )}
          </div>
        </div>

        {outcome && (
          <div
            className={`mb-6 text-center px-4 py-3 rounded-lg ${
              outcome.win
                ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
            }`}
          >
            {outcome.win ? (
              <>
                💸 Cashed out at <b>{outcome.cashedAt?.toFixed(2)}×</b> — payout{" "}
                <b>{outcome.winAmount}</b> (it flew to{" "}
                {outcome.crashAt.toFixed(2)}×).
              </>
            ) : (
              <>
                💥 Crashed at <b>{outcome.crashAt.toFixed(2)}×</b> before you
                cashed out.
              </>
            )}
          </div>
        )}

        {/* Bet controls */}
        <div className="mb-4">
          <div className="text-slate-400 text-xs uppercase mb-2">Bet amount</div>
          <div className="flex flex-wrap gap-2">
            {BET_CHIPS.map((c) => (
              <button
                key={c}
                disabled={flying || busy || betPlaced}
                onClick={() => setBet(c)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                  bet === c
                    ? "bg-indigo-600 border-indigo-500"
                    : "bg-slate-800 border-slate-700 hover:bg-slate-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy || flying || betPlaced}
            onClick={placeBet}
            className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-lg font-medium disabled:opacity-60"
          >
            {betPlaced ? `✓ Bet placed (${bet})` : `🎲 Place a bet (${bet})`}
          </button>
          {flying ? (
            <button
              onClick={cashOut}
              className="bg-emerald-600 hover:bg-emerald-500 px-5 py-3 rounded-lg font-semibold animate-pulse"
            >
              💸 Cash out ({Math.round(bet * multiplier)})
            </button>
          ) : (
            <button
              disabled={busy || !betPlaced}
              onClick={takeOff}
              className="bg-indigo-600 hover:bg-indigo-500 px-5 py-3 rounded-lg font-medium disabled:opacity-60"
              title={!betPlaced ? "Place a bet first" : undefined}
            >
              ▶ Take off
            </button>
          )}
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
    </DashboardLayout>
  );
};

export default Aviator;
