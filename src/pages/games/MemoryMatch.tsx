import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FC,
} from "react";
import { toast } from "react-toastify";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import { useSocket } from "@/context/SocketContext";
import type { GamificationProfile } from "@/types";

const SYMBOLS = ["🐉", "🔥", "💎", "⚔️", "🏆", "🎲", "🌟", "🎯"];

interface Card {
  id: number;
  symbol: string;
  matched: boolean;
  flipped: boolean;
}

const randomGameId = () => `memory-${Math.random().toString(36).slice(2, 10)}`;
const newKey = (type: string) =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const shuffle = <T,>(arr: T[]): T[] => {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const buildDeck = (): Card[] =>
  shuffle(
    SYMBOLS.flatMap((s, i) => [
      { id: i * 2, symbol: s, matched: false, flipped: false },
      { id: i * 2 + 1, symbol: s, matched: false, flipped: false },
    ])
  );

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

const MemoryMatch: FC = () => {
  const [cards, setCards] = useState<Card[]>(buildDeck);
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const { on } = useSocket();

  const done = useMemo(() => cards.every((c) => c.matched), [cards]);

  const loadProfile = useCallback(async () => {
    const r = await endpoints.profile.get();
    if (r?.success && r.data) setProfile(r.data);
  }, []);

  useEffect(() => {
    loadProfile();
    const off = on("xp:awarded", () => loadProfile());
    return off;
  }, [loadProfile, on]);

  useEffect(() => {
    if (!startedAt || done) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => clearInterval(t);
  }, [startedAt, done]);

  const reset = () => {
    setCards(buildDeck());
    setPicked([]);
    setMoves(0);
    setStartedAt(null);
    setElapsed(0);
  };

  const flip = (id: number) => {
    if (busy) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.matched || card.flipped) return;
    if (picked.length === 2) return;

    if (!startedAt) setStartedAt(Date.now());

    const next = cards.map((c) => (c.id === id ? { ...c, flipped: true } : c));
    const nextPicked = [...picked, id];
    setCards(next);
    setPicked(nextPicked);

    if (nextPicked.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = nextPicked
        .map((pid) => next.find((c) => c.id === pid)!)
        .filter(Boolean);
      if (a.symbol === b.symbol) {
        setTimeout(() => {
          setCards((cs) =>
            cs.map((c) =>
              c.id === a.id || c.id === b.id
                ? { ...c, matched: true }
                : c
            )
          );
          setPicked([]);
        }, 350);
      } else {
        setTimeout(() => {
          setCards((cs) =>
            cs.map((c) =>
              c.id === a.id || c.id === b.id
                ? { ...c, flipped: false }
                : c
            )
          );
          setPicked([]);
        }, 750);
      }
    }
  };

  // Award XP exactly once when the board is cleared.
  useEffect(() => {
    if (!done || !startedAt || busy) return;
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    // Fewer moves + faster time = more XP. SYMBOLS.length is the perfect-game
    // floor — every extra move shaves a point.
    const movesPenalty = Math.max(0, moves - SYMBOLS.length);
    const xp = Math.max(10, 100 - movesPenalty * 4 - Math.floor(seconds / 2));

    (async () => {
      try {
        setBusy(true);
        const r = await endpoints.activity.record({
          type: "GAME_PLAY",
          gameId: randomGameId(),
          amount: xp,
          idempotencyKey: newKey("GAME_PLAY"),
          meta: {
            game: "memory-match",
            name: "Memory Match",
            category: "MT_ORIGINALS",
            provider: "Pragmatics",
            moves,
            seconds,
            win: true,
          },
        });
        if (r?.success) {
          toast.success(`🧠 Cleared in ${moves} moves — +${r.data?.xpAwarded ?? 0} XP!`);
        }
        await loadProfile();
      } catch {
        toast.error("Could not record activity");
      } finally {
        setBusy(false);
      }
    })();
  }, [done, startedAt, moves, busy, loadProfile]);

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">🧠 Memory Match</h1>
          <p className="text-slate-400 text-sm mt-1">
            Flip two cards at a time. Match every pair. Fewer moves and faster
            time → more XP.
          </p>
        </div>
        {profile && (
          <div className="flex gap-3">
            <Stat label="Total XP" value={profile.xpTotal} />
            <Stat label="Level" value={profile.level} accent="text-emerald-400" />
            <Stat label="Rank" value={profile.rank.name} accent="text-amber-400" />
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-5 text-sm">
          <div className="flex gap-4">
            <span className="text-slate-400">
              Moves <span className="text-white font-bold ml-1">{moves}</span>
            </span>
            <span className="text-slate-400">
              Time{" "}
              <span className="text-white font-bold ml-1">
                {Math.floor(elapsed / 1000)}s
              </span>
            </span>
          </div>
          <button
            onClick={reset}
            className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm"
          >
            ↻ New game
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {cards.map((c) => {
            const show = c.flipped || c.matched;
            return (
              <button
                key={c.id}
                onClick={() => flip(c.id)}
                disabled={c.matched || busy}
                className={`aspect-square rounded-xl text-3xl flex items-center justify-center border transition-all ${
                  show
                    ? c.matched
                      ? "bg-emerald-500/20 border-emerald-400"
                      : "bg-indigo-500/20 border-indigo-400"
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700"
                }`}
              >
                {show ? c.symbol : "?"}
              </button>
            );
          })}
        </div>

        {done && (
          <div className="mt-6 text-center bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-lg">
            🎉 Cleared in {moves} moves · {Math.floor(elapsed / 1000)}s
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MemoryMatch;
