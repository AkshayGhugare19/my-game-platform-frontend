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

const W = 640;
const H = 260;
const GROUND_Y = H - 40;
const DRAGON_X = 80;
const DRAGON_SIZE = 36;
const GRAVITY = 0.7;
const JUMP_V = -12.5;
const BASE_SPEED = 4;
const SPEED_RAMP = 0.0015;

type Obstacle = { x: number; w: number; h: number };
type Gem = { x: number; y: number; r: number; taken: boolean };

const randomGameId = () => `dragon-${Math.random().toString(36).slice(2, 10)}`;
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

const DragonRun: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const stateRef = useRef({
    y: GROUND_Y - DRAGON_SIZE,
    vy: 0,
    obstacles: [] as Obstacle[],
    gems: [] as Gem[],
    spawnTimer: 0,
    gemTimer: 0,
    speed: BASE_SPEED,
    score: 0,
    gemsCollected: 0,
    distance: 0,
    over: false,
  });

  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gems, setGems] = useState(0);
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

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.over) return;
    if (s.y >= GROUND_Y - DRAGON_SIZE - 0.5) {
      s.vy = JUMP_V;
    }
  }, []);

  const reset = () => {
    stateRef.current = {
      y: GROUND_Y - DRAGON_SIZE,
      vy: 0,
      obstacles: [],
      gems: [],
      spawnTimer: 60,
      gemTimer: 90,
      speed: BASE_SPEED,
      score: 0,
      gemsCollected: 0,
      distance: 0,
      over: false,
    };
    setScore(0);
    setGems(0);
    setGameOver(false);
  };

  const recordRound = useCallback(
    async (finalScore: number, finalGems: number) => {
      try {
        setBusy(true);
        const xp = Math.max(0, Math.floor(finalScore / 10) + finalGems * 5);
        const response = await endpoints.activity.record({
          type: "GAME_PLAY",
          gameId: randomGameId(),
          amount: xp,
          idempotencyKey: newKey("GAME_PLAY"),
          meta: {
            game: "dragon-run",
            name: "Dragon Run",
            category: "MT_ORIGINALS",
            provider: "Pragmatics",
            score: finalScore,
            gems: finalGems,
            win: finalScore > 0,
          },
        });
        if (response?.success) {
          toast.success(`+${response.data?.xpAwarded ?? 0} XP for the run!`);
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

  const endGame = useCallback(
    (finalScore: number, finalGems: number) => {
      stateRef.current.over = true;
      setGameOver(true);
      setRunning(false);
      toast.info(`💥 Crashed at ${finalScore} pts (+${finalGems} 💎)`);
      void recordRound(finalScore, finalGems);
    },
    [recordRound]
  );

  // Game loop
  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      const s = stateRef.current;
      if (s.over) return;

      // physics
      s.vy += GRAVITY;
      s.y += s.vy;
      if (s.y > GROUND_Y - DRAGON_SIZE) {
        s.y = GROUND_Y - DRAGON_SIZE;
        s.vy = 0;
      }

      s.speed = BASE_SPEED + s.distance * SPEED_RAMP;
      s.distance += s.speed;
      s.score = Math.floor(s.distance / 6) + s.gemsCollected * 10;

      // spawn obstacles
      s.spawnTimer -= 1;
      if (s.spawnTimer <= 0) {
        const h = 20 + Math.floor(Math.random() * 35);
        const w = 16 + Math.floor(Math.random() * 18);
        s.obstacles.push({ x: W + 10, w, h });
        s.spawnTimer = 60 + Math.floor(Math.random() * 60);
      }
      // spawn gems
      s.gemTimer -= 1;
      if (s.gemTimer <= 0) {
        const y = GROUND_Y - 60 - Math.floor(Math.random() * 70);
        s.gems.push({ x: W + 10, y, r: 8, taken: false });
        s.gemTimer = 110 + Math.floor(Math.random() * 90);
      }

      // move + collide
      for (const o of s.obstacles) o.x -= s.speed;
      for (const g of s.gems) g.x -= s.speed;
      s.obstacles = s.obstacles.filter((o) => o.x + o.w > -20);
      s.gems = s.gems.filter((g) => g.x > -20);

      const dragonRect = {
        x: DRAGON_X + 4,
        y: s.y + 4,
        w: DRAGON_SIZE - 8,
        h: DRAGON_SIZE - 8,
      };

      // gem pickup
      for (const g of s.gems) {
        if (g.taken) continue;
        const dx = g.x - (dragonRect.x + dragonRect.w / 2);
        const dy = g.y - (dragonRect.y + dragonRect.h / 2);
        if (Math.hypot(dx, dy) < g.r + dragonRect.w / 2) {
          g.taken = true;
          s.gemsCollected += 1;
          setGems(s.gemsCollected);
        }
      }
      s.gems = s.gems.filter((g) => !g.taken);

      // obstacle collision
      for (const o of s.obstacles) {
        const ox = o.x;
        const oy = GROUND_Y - o.h;
        if (
          dragonRect.x < ox + o.w &&
          dragonRect.x + dragonRect.w > ox &&
          dragonRect.y < oy + o.h &&
          dragonRect.y + dragonRect.h > oy
        ) {
          endGame(s.score, s.gemsCollected);
          return;
        }
      }

      setScore(s.score);

      // render
      ctx.clearRect(0, 0, W, H);
      // sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#0f172a");
      sky.addColorStop(1, "#1e293b");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // distant mountains
      ctx.fillStyle = "#334155";
      for (let i = 0; i < 5; i += 1) {
        const mx = ((i * 180 - (s.distance * 0.2) % 180) + W) % (W + 180) - 80;
        ctx.beginPath();
        ctx.moveTo(mx, GROUND_Y);
        ctx.lineTo(mx + 80, GROUND_Y - 70);
        ctx.lineTo(mx + 160, GROUND_Y);
        ctx.fill();
      }

      // ground
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      ctx.strokeStyle = "#4338ca";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(W, GROUND_Y);
      ctx.stroke();

      // obstacles (walls)
      for (const o of s.obstacles) {
        ctx.fillStyle = "#f43f5e";
        ctx.fillRect(o.x, GROUND_Y - o.h, o.w, o.h);
        ctx.fillStyle = "#9f1239";
        ctx.fillRect(o.x, GROUND_Y - o.h, o.w, 4);
      }

      // gems
      for (const g of s.gems) {
        ctx.beginPath();
        ctx.fillStyle = "#22d3ee";
        ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#67e8f9";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // dragon (emoji-on-canvas — keeps it simple)
      ctx.font = `${DRAGON_SIZE}px serif`;
      ctx.textBaseline = "top";
      ctx.fillText("🐉", DRAGON_X, s.y);

      // score overlay
      ctx.font = "bold 14px ui-sans-serif, system-ui";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(`Score ${s.score}`, 12, 10);
      ctx.fillStyle = "#67e8f9";
      ctx.fillText(`💎 ${s.gemsCollected}`, 12, 30);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [running, endGame]);

  // Controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (!running && !busy) {
          reset();
          setRunning(true);
        } else {
          jump();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, busy, jump]);

  const start = () => {
    if (busy) return;
    reset();
    setRunning(true);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">🐉 Dragon Run</h1>
          <p className="text-slate-400 text-sm mt-1">
            Space / Tap to jump. Dodge the walls, grab the gems. One hit and it's
            over — XP scales with distance + gems.
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
        <div className="flex justify-between text-sm mb-3">
          <span className="text-slate-400">
            Score <span className="text-white font-bold ml-1">{score}</span>
          </span>
          <span className="text-cyan-400">💎 {gems}</span>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-lg cursor-pointer select-none"
          onPointerDown={() => {
            if (!running && !busy) start();
            else jump();
          }}
          style={{ maxWidth: W, margin: "0 auto" }}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="block w-full h-auto bg-slate-950 rounded-lg"
          />

          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 text-center px-6">
              {gameOver ? (
                <>
                  <div className="text-3xl mb-2">💥</div>
                  <div className="text-xl font-bold mb-1">Crashed!</div>
                  <div className="text-slate-400 text-sm mb-4">
                    Score {score} · {gems} 💎
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2">🐉</div>
                  <div className="text-xl font-bold mb-1">Ready to run?</div>
                  <div className="text-slate-400 text-sm mb-4">
                    Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Space</kbd>{" "}
                    or tap the canvas to jump.
                  </div>
                </>
              )}
              <button
                onClick={start}
                disabled={busy}
                className="bg-rose-500 hover:bg-rose-400 disabled:opacity-60 px-6 py-2.5 rounded-lg font-semibold"
              >
                {gameOver ? "▶ Play again" : "▶ Start"}
              </button>
            </div>
          )}
        </div>

        {profile && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Level {profile.progress.level} progress</span>
              <span>
                {profile.progress.xpIntoLevel} /{" "}
                {profile.progress.nextLevelXp ?? "max"} XP
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-orange-500"
                style={{ width: `${profile.progress.progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DragonRun;
