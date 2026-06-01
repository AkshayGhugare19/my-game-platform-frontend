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

const DURATION_MS = 15_000;
const TARGET_LIFETIME = 1100;

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  bornAt: number;
}

const randomGameId = () => `clickstorm-${Math.random().toString(36).slice(2, 10)}`;
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

const ClickStorm: FC = () => {
  const arenaRef = useRef<HTMLDivElement>(null);
  const spawnTimerRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);
  const seqRef = useRef(0);

  const [targets, setTargets] = useState<Target[]>([]);
  const [running, setRunning] = useState(false);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_MS);
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const { on } = useSocket();

  const loadProfile = useCallback(async () => {
    const r = await endpoints.profile.get();
    if (r?.success && r.data) setProfile(r.data);
  }, []);

  useEffect(() => {
    loadProfile();
    const off = on("xp:awarded", () => loadProfile());
    return off;
  }, [loadProfile, on]);

  const stop = useCallback(
    async (finalHits: number, finalMisses: number) => {
      if (spawnTimerRef.current != null) clearInterval(spawnTimerRef.current);
      if (tickTimerRef.current != null) clearInterval(tickTimerRef.current);
      spawnTimerRef.current = null;
      tickTimerRef.current = null;
      setRunning(false);
      setTargets([]);

      try {
        setBusy(true);
        const xp = finalHits * 3;
        const r = await endpoints.activity.record({
          type: "GAME_PLAY",
          gameId: randomGameId(),
          amount: xp,
          idempotencyKey: newKey("GAME_PLAY"),
          meta: {
            game: "click-storm",
            name: "Click Storm",
            category: "MT_ORIGINALS",
            provider: "SDLC",
            hits: finalHits,
            misses: finalMisses,
            accuracy:
              finalHits + finalMisses === 0
                ? 0
                : finalHits / (finalHits + finalMisses),
            win: finalHits > 0,
          },
        });
        if (r?.success) {
          toast.success(`⚡ ${finalHits} hits — +${r.data?.xpAwarded ?? 0} XP`);
        }
        await loadProfile();
      } catch {
        toast.error("Could not record activity");
      } finally {
        setBusy(false);
      }
    },
    [loadProfile]
  );

  const start = () => {
    if (busy || running) return;
    setHits(0);
    setMisses(0);
    setTimeLeft(DURATION_MS);
    setTargets([]);
    seqRef.current = 0;
    setRunning(true);

    const startedAt = Date.now();
    tickTimerRef.current = window.setInterval(() => {
      const left = Math.max(0, DURATION_MS - (Date.now() - startedAt));
      setTimeLeft(left);
      if (left <= 0) {
        // Capture the current totals at fire-time via functional setState.
        let snapH = 0;
        let snapM = 0;
        setHits((h) => {
          snapH = h;
          return h;
        });
        setMisses((m) => {
          snapM = m;
          return m;
        });
        // Defer so React commits the snapshots before we stop.
        setTimeout(() => void stop(snapH, snapM), 0);
      }
      // Cull expired targets in the same tick.
      setTargets((ts) =>
        ts.filter((t) => Date.now() - t.bornAt < TARGET_LIFETIME)
      );
    }, 100);

    spawnTimerRef.current = window.setInterval(() => {
      const arena = arenaRef.current;
      if (!arena) return;
      const rect = arena.getBoundingClientRect();
      const size = 36 + Math.floor(Math.random() * 24);
      const x = Math.random() * Math.max(0, rect.width - size);
      const y = Math.random() * Math.max(0, rect.height - size);
      seqRef.current += 1;
      setTargets((ts) => [
        ...ts,
        { id: seqRef.current, x, y, size, bornAt: Date.now() },
      ]);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (spawnTimerRef.current != null) clearInterval(spawnTimerRef.current);
      if (tickTimerRef.current != null) clearInterval(tickTimerRef.current);
    };
  }, []);

  const onArenaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!running) return;
    if ((e.target as HTMLElement).dataset.target === "1") return;
    setMisses((m) => m + 1);
  };

  const onTargetClick = (id: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!running) return;
    setTargets((ts) => ts.filter((t) => t.id !== id));
    setHits((h) => h + 1);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">⚡ Click Storm</h1>
          <p className="text-slate-400 text-sm mt-1">
            15 seconds. Click every target before it disappears. Misses cost
            accuracy.
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4 text-sm">
          <div className="flex gap-4">
            <span className="text-slate-400">
              Hits <span className="text-emerald-400 font-bold ml-1">{hits}</span>
            </span>
            <span className="text-slate-400">
              Misses <span className="text-rose-400 font-bold ml-1">{misses}</span>
            </span>
            <span className="text-slate-400">
              Time{" "}
              <span className="text-white font-bold ml-1">
                {(timeLeft / 1000).toFixed(1)}s
              </span>
            </span>
          </div>
          <button
            onClick={start}
            disabled={running || busy}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {running ? "Running…" : "▶ Start"}
          </button>
        </div>

        <div
          ref={arenaRef}
          onClick={onArenaClick}
          className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden select-none"
          style={{ height: 360 }}
        >
          {!running && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 pointer-events-none">
              {hits + misses > 0
                ? `Round over · ${hits} hits / ${misses} misses`
                : "Press Start to begin"}
            </div>
          )}
          {targets.map((t) => (
            <button
              key={t.id}
              data-target="1"
              onClick={onTargetClick(t.id)}
              className="absolute rounded-full bg-gradient-to-br from-amber-400 to-rose-500 shadow-[0_0_20px_-4px_rgba(251,191,36,0.6)] hover:scale-110 transition-transform"
              style={{
                left: t.x,
                top: t.y,
                width: t.size,
                height: t.size,
              }}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClickStorm;
