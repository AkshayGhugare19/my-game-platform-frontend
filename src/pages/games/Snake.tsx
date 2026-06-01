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

// Grid-based playfield. The canvas is CELLS×CELLS cells, each CELL px.
const CELLS = 20;
const CELL = 20;
const W = CELLS * CELL;
const H = CELLS * CELL;
const TICK_MS = 130; // step interval — lower is faster

type Point = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";

const DELTAS: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const randomGameId = () => `snake-${Math.random().toString(36).slice(2, 10)}`;
const newKey = (type: string) =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const spawnFood = (snake: Point[]): Point => {
  // Reject positions that overlap the snake.
  let p: Point;
  do {
    p = {
      x: Math.floor(Math.random() * CELLS),
      y: Math.floor(Math.random() * CELLS),
    };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
};

const initialSnake = (): Point[] => [
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 6, y: 10 },
];

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

const Snake: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef<number | null>(null);
  const stateRef = useRef({
    snake: initialSnake(),
    dir: "right" as Dir,
    nextDir: "right" as Dir,
    food: { x: 14, y: 10 } as Point,
    score: 0,
    over: false,
  });

  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    // board
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1;
    for (let i = 1; i < CELLS; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(W, i * CELL);
      ctx.stroke();
    }

    // food
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(
      s.food.x * CELL + CELL / 2,
      s.food.y * CELL + CELL / 2,
      CELL / 2 - 3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // snake
    s.snake.forEach((seg, i) => {
      const head = i === 0;
      ctx.fillStyle = head ? "#34d399" : "#10b981";
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, []);

  const recordRound = useCallback(
    async (finalScore: number) => {
      try {
        setBusy(true);
        const apples = Math.floor(finalScore / 10);
        const xp = apples * 5;
        const response = await endpoints.activity.record({
          type: "GAME_PLAY",
          gameId: randomGameId(),
          amount: xp,
          idempotencyKey: newKey("GAME_PLAY"),
          meta: {
            game: "snake",
            name: "Snake",
            category: "MT_ORIGINALS",
            provider: "External",
            score: finalScore,
            apples,
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
    (finalScore: number) => {
      stateRef.current.over = true;
      if (tickRef.current != null) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      setGameOver(true);
      setRunning(false);
      toast.info(`💥 Game over — ${finalScore} pts`);
      void recordRound(finalScore);
    },
    [recordRound]
  );

  const step = useCallback(() => {
    const s = stateRef.current;
    if (s.over) return;

    // Commit the buffered turn (ignores 180° reversals).
    if (s.nextDir !== OPPOSITE[s.dir]) s.dir = s.nextDir;

    const d = DELTAS[s.dir];
    const head = s.snake[0];
    const next: Point = { x: head.x + d.x, y: head.y + d.y };

    // wall collision
    if (next.x < 0 || next.x >= CELLS || next.y < 0 || next.y >= CELLS) {
      endGame(s.score);
      return;
    }
    // self collision (tail tip moves away unless we just ate, so check all but last)
    const willEat = next.x === s.food.x && next.y === s.food.y;
    const body = willEat ? s.snake : s.snake.slice(0, -1);
    if (body.some((seg) => seg.x === next.x && seg.y === next.y)) {
      endGame(s.score);
      return;
    }

    s.snake.unshift(next);
    if (willEat) {
      s.score += 10;
      setScore(s.score);
      s.food = spawnFood(s.snake);
    } else {
      s.snake.pop();
    }

    draw();
  }, [draw, endGame]);

  const start = useCallback(() => {
    if (busy) return;
    if (tickRef.current != null) clearInterval(tickRef.current);
    stateRef.current = {
      snake: initialSnake(),
      dir: "right",
      nextDir: "right",
      food: spawnFood(initialSnake()),
      score: 0,
      over: false,
    };
    setScore(0);
    setGameOver(false);
    setRunning(true);
    draw();
    tickRef.current = window.setInterval(step, TICK_MS);
  }, [busy, draw, step]);

  // Re-bind the interval whenever `step` changes so it always sees fresh deps.
  useEffect(() => {
    if (!running) return;
    if (tickRef.current != null) clearInterval(tickRef.current);
    tickRef.current = window.setInterval(step, TICK_MS);
    return () => {
      if (tickRef.current != null) clearInterval(tickRef.current);
    };
  }, [running, step]);

  // Initial paint + cleanup on unmount.
  useEffect(() => {
    draw();
    return () => {
      if (tickRef.current != null) clearInterval(tickRef.current);
    };
  }, [draw]);

  const turn = useCallback(
    (dir: Dir) => {
      const s = stateRef.current;
      if (s.over || !running) return;
      if (dir === OPPOSITE[s.dir]) return;
      s.nextDir = dir;
    },
    [running]
  );

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        KeyW: "up",
        KeyS: "down",
        KeyA: "left",
        KeyD: "right",
      };
      const dir = map[e.code];
      if (!dir) return;
      e.preventDefault();
      if (!running && !busy) {
        start();
        return;
      }
      turn(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, busy, start, turn]);

  const DPadBtn: FC<{ dir: Dir; label: string; className?: string }> = ({
    dir,
    label,
    className = "",
  }) => (
    <button
      onClick={() => turn(dir)}
      disabled={!running}
      className={`bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg w-14 h-14 text-xl font-bold ${className}`}
    >
      {label}
    </button>
  );

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">🐍 Snake</h1>
          <p className="text-slate-400 text-sm mt-1">
            Arrow keys / WASD to steer. Eat the apples to grow — hit a wall or
            yourself and it's over. XP scales with apples eaten.
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
          <span className="text-emerald-400">🍎 {Math.floor(score / 10)}</span>
        </div>

        <div
          className="relative w-full overflow-hidden rounded-lg select-none"
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
                  <div className="text-xl font-bold mb-1">Game over!</div>
                  <div className="text-slate-400 text-sm mb-4">
                    Score {score} · {Math.floor(score / 10)} 🍎
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2">🐍</div>
                  <div className="text-xl font-bold mb-1">Ready to slither?</div>
                  <div className="text-slate-400 text-sm mb-4">
                    Press an{" "}
                    <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">arrow</kbd>{" "}
                    key or Start.
                  </div>
                </>
              )}
              <button
                onClick={start}
                disabled={busy}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 px-6 py-2.5 rounded-lg font-semibold text-slate-950"
              >
                {gameOver ? "▶ Play again" : "▶ Start"}
              </button>
            </div>
          )}
        </div>

        {/* On-screen D-pad for touch devices */}
        <div className="mt-4 flex flex-col items-center gap-2 sm:hidden">
          <DPadBtn dir="up" label="▲" />
          <div className="flex gap-2">
            <DPadBtn dir="left" label="◀" />
            <DPadBtn dir="down" label="▼" />
            <DPadBtn dir="right" label="▶" />
          </div>
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
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                style={{ width: `${profile.progress.progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Snake;
