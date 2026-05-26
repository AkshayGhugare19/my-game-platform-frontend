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

const Stat: FC<{ label: string; value: string | number; accent?: string }> = ({
  label,
  value,
  accent = "text-indigo-400",
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
    <div className="text-slate-400 text-xs uppercase">{label}</div>
    <div className={`text-2xl font-bold mt-1 ${accent}`}>{value}</div>
  </div>
);

const BET_CHIPS = [5, 10, 25, 50, 75];

/** Random, throwaway game id for each round — analytics only. */
const randomGameId = () => `game-${Math.random().toString(36).slice(2, 10)}`;

const newKey = (type: string) =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const Dashboard: FC = () => {
  const [p, setP] = useState<GamificationProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const { on } = useSocket();

  // --- Mini-game state ---
  const [bet, setBet] = useState(10);
  const [betPlaced, setBetPlaced] = useState(false);
  const [pos, setPos] = useState(0); // sweeping marker, 0..100
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<
    { value: number; win: boolean } | null
  >(null);

  const rafRef = useRef<number | null>(null);
  const dirRef = useRef(1);
  const lastRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    const r = await endpoints.profile.get();
    if (r?.success && r.data) setP(r.data);
  }, []);

  useEffect(() => {
    load();
    const off = on("xp:awarded", () => load());
    return off;
  }, [load, on]);

  // Sweep the marker left↔right while the round is running.
  useEffect(() => {
    if (!running) return;
    const SPEED = 70; // units per second

    const tick = (t: number) => {
      if (lastRef.current == null) lastRef.current = t;
      const dt = (t - lastRef.current) / 1000;
      lastRef.current = t;

      setPos((prev) => {
        let next = prev + dirRef.current * SPEED * dt;
        if (next >= 100) {
          next = 100;
          dirRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          dirRef.current = 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastRef.current = null;
    };
  }, [running]);

  // Locking the bet is local only — no API call until the round ends.
  const placeBet = () => {
    if (running || busy) return;
    setBetPlaced(true);
    setOutcome(null);
    toast.info(`Bet placed: ${bet}. Play the game!`);
  };

  const startRound = () => {
    if (busy || !betPlaced) return;
    setOutcome(null);
    setPos(0);
    dirRef.current = 1;
    lastRef.current = null;
    setRunning(true);
  };

  const stopRound = async () => {
    if (!running) return;
    setRunning(false);
    const value = Math.round(pos);
    const win = value >= bet; // land past your bet line to win
    setOutcome({ value, win });

    // Win pays the bet, a loss pays nothing — this is the amount the API gets.
    const winAmount = win ? bet : 0;

    if (win) toast.success(`🎉 You  WIN ${value}!`);
    else toast.info(`Landed on ${value} — missed the ${bet} line.`);

    try {
      setBusy(true);
      const response = await endpoints.activity.record({
        type: "GAME_PLAY",
        gameId: randomGameId(),
        amount: winAmount,
        idempotencyKey: newKey("GAME_PLAY"),
        meta: {
          game: "slider",
          name: "Slider",
          category: "Slots",
          provider: "Internal",
          value,
          bet,
          win,
          winAmount,
        },
      });
      if (response?.success)
        toast.success(
          `+${response.data?.xpAwarded ?? 0} XP for participating!`
        );
      await load();
    } catch {
      toast.error("Could not record activity");
    } finally {
      setBetPlaced(false); // bet consumed — place again for the next round
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-slate-400 mb-6">
        XP rewards participation — not winning or losing.
      </p>

      {p && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Stat label="Total XP" value={p.xpTotal} />
            <Stat label="Level" value={p.level} accent="text-emerald-400" />
            <Stat label="Rank" value={p.rank.name} accent="text-amber-400" />
            <Stat label="Coins" value={p.coins} accent="text-yellow-300" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>
                Level {p.progress.level}
                {p.maxLevel ? ` / ${p.maxLevel}` : ""} progress
              </span>
              <span className="text-slate-400">
                {p.progress.xpIntoLevel} XP
                {p.progress.nextLevelXp
                  ? ` → ${p.progress.nextLevelXp} XP`
                  : " (max)"}
              </span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all"
                style={{ width: `${p.progress.progressPct}%` }}
              />
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500 mt-2">
              <span>
                🔥 Streak: {p.streak.current} day(s) · Longest {p.streak.longest}
              </span>
              {p.nextRank ? (
                <span>
                  Next:{" "}
                  <span className="text-indigo-300 font-medium">
                    {p.nextRank.name}
                  </span>{" "}
                  · {p.nextRank.xpRemaining} XP to go
                  {p.nextRank.rewardType
                    ? ` · reward ${p.nextRank.rewardValue ?? ""} ${p.nextRank.rewardType.replace(
                        /_/g,
                        " "
                      )}`
                    : ""}
                </span>
              ) : (
                <span className="text-emerald-400">Max rank reached 🎉</span>
              )}
            </div>
          </div>

          {/* --- Bet amount + slider mini-game --- */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">🎰 Slider Game</h2>
              <span className="text-xs text-slate-500">
                Stop past your bet line to win
              </span>
            </div>

            <div className="mb-4">
              <div className="text-slate-400 text-xs uppercase mb-2">
                Bet amount
              </div>
              <div className="flex flex-wrap gap-2">
                {BET_CHIPS.map((c) => (
                  <button
                    key={c}
                    disabled={running || busy || betPlaced}
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

            {/* Track: green = win zone (>= bet), slate = miss zone */}
            <div className="relative h-10 mb-2 select-none">
              <div className="absolute inset-0 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="absolute inset-y-0 right-0 bg-emerald-600/40"
                  style={{ width: `${100 - bet}%` }}
                />
              </div>
              {/* Bet line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
                style={{ left: `${bet}%` }}
              />
              {/* Moving / locked marker */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-9 rounded ${
                  outcome
                    ? outcome.win
                      ? "bg-emerald-400"
                      : "bg-rose-500"
                    : "bg-white"
                }`}
                style={{ left: `${pos}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mb-4">
              <span>0</span>
              <span>
                Marker: <b className="text-slate-300">{Math.round(pos)}</b> · Bet
                line: <b className="text-amber-400">{bet}</b>
              </span>
              <span>100</span>
            </div>

            {outcome && (
              <div
                className={`mb-4 text-sm font-medium ${
                  outcome.win ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {outcome.win
                  ? `WIN — landed on ${outcome.value} (≥ ${bet})`
                  : `LOSS — landed on ${outcome.value} (< ${bet})`}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                disabled={busy || running || betPlaced}
                onClick={placeBet}
                className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-lg font-medium disabled:opacity-60"
              >
                {betPlaced ? `✓ Bet placed (${bet})` : `🎲 Place a bet (${bet})`}
              </button>
              {!running ? (
                <button
                  disabled={busy || !betPlaced}
                  onClick={startRound}
                  className="bg-indigo-600 hover:bg-indigo-500 px-5 py-3 rounded-lg font-medium disabled:opacity-60"
                  title={!betPlaced ? "Place a bet first" : undefined}
                >
                  ▶ Play game
                </button>
              ) : (
                <button
                  onClick={stopRound}
                  className="bg-rose-600 hover:bg-rose-500 px-5 py-3 rounded-lg font-medium"
                >
                  ⏹ Stop
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
