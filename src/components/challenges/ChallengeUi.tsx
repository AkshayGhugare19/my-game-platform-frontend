import { useState, type FC } from "react";
import {
  ChevronRight,
  Coins,
  Dice5,
  Gift,
  Play,
  Target,
  X,
} from "lucide-react";
import { gameMeta } from "@/config/gamesCatalog";
import Countdown from "@/components/Countdown";
import type { Challenge, ChallengeStatus } from "@/types";

/**
 * Shared, presentation-only challenge UI. Mirrors
 * `src/components/missions/MissionUi.tsx` structure/visuals — kept as a
 * parallel component (rather than reused) because a Challenge's condition is
 * a free-text `condition_label` (e.g. "Hit 1,000x multiplier") instead of a
 * mission's `condition` + `bucket`/`vip`/`duration_days` fields.
 */

export const STATUS_PILL: Record<ChallengeStatus, string> = {
  AVAILABLE: "text-slate-300 bg-slate-700/60 ring-slate-500/30",
  IN_PROGRESS: "text-amber-300 bg-amber-500/15 ring-amber-500/30",
  COMPLETED: "text-emerald-300 bg-emerald-500/15 ring-emerald-500/30",
  CLAIMED: "text-indigo-300 bg-indigo-500/15 ring-indigo-500/30",
};

export const STATUS_LABEL: Record<ChallengeStatus, string> = {
  AVAILABLE: "Available",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CLAIMED: "Claimed",
};

export const pct = (c: Challenge) =>
  c.target > 0 ? Math.min(100, Math.round((c.progress / c.target) * 100)) : 0;

/** Card thumbnail with a graceful gradient fallback when the image is missing. */
export const Thumb: FC<{ c: Challenge; size?: number }> = ({
  c,
  size = 72,
}) => {
  const [broken, setBroken] = useState(false);
  const show = c.banner_image && !broken;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl grid place-items-center"
      style={{
        width: size,
        height: size,
        backgroundImage: show
          ? undefined
          : "linear-gradient(135deg, #6d28d9cc, #0f172a)",
      }}
    >
      {show ? (
        <img
          src={c.banner_image as string}
          alt={c.name}
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : /sport/i.test(c.category) ? (
        <Dice5 size={size * 0.4} className="text-white/40" />
      ) : (
        <Target size={size * 0.4} className="text-white/40" />
      )}
    </div>
  );
};

export const ChallengeCard: FC<{ c: Challenge; onOpen: () => void }> = ({
  c,
  onOpen,
}) => (
  <button
    onClick={onOpen}
    className="group flex w-full items-stretch gap-3 rounded-2xl bg-slate-900/80 p-3 text-left ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:ring-violet-500/30"
  >
    <Thumb c={c} />
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-full bg-slate-700/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          {c.provider ?? c.category}
        </span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_PILL[c.status]}`}
        >
          {STATUS_LABEL[c.status]}
        </span>
      </div>
      <div className="truncate text-sm font-semibold text-slate-100">
        Name: {c.name}
      </div>
      <div className="truncate text-xs text-slate-400">
        {c.condition_label}
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-800/70 px-2.5 py-1.5">
        <Gift size={14} className="shrink-0 text-violet-300" />
        <span className="text-[11px] text-slate-400">Reward:</span>
        <span className="truncate text-xs font-semibold text-slate-100">
          {c.reward_label}
        </span>
        <ChevronRight
          size={16}
          className="ml-auto shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {c.min_bet != null && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/70 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
            <Coins size={11} className="text-violet-300" /> Min ${c.min_bet}
          </span>
        )}
        <Countdown end={c.end_date} />
      </div>
      {(c.status === "IN_PROGRESS" || c.status === "COMPLETED") && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
              style={{ width: `${pct(c)}%` }}
            />
          </div>
          <div className="mt-1 text-right text-[10px] text-slate-400">
            {c.progress}/{c.target}
          </div>
        </div>
      )}
    </div>
  </button>
);

const Row: FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-4 py-2.5">
    <span className="text-sm text-slate-400">{label}</span>
    <span className="text-right text-sm font-semibold text-slate-100">
      {value}
    </span>
  </div>
);

const ChallengeGames: FC<{
  games: string[];
  onPlay: (key: string) => void;
}> = ({ games, onPlay }) => {
  if (games.length === 0) return null;
  return (
    <div className="mt-5">
      <div className="mb-2 font-semibold text-slate-200">Challenge Games</div>
      <div className="grid grid-cols-3 gap-2">
        {games.map((key) => {
          const g = gameMeta(key);
          const Icon = g.icon;
          return (
            <button
              key={key}
              onClick={() => onPlay(key)}
              className={`group flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br ${g.accent} p-2 text-center ring-1 ring-white/10 transition-transform hover:-translate-y-0.5`}
            >
              <Icon size={22} className="text-white" />
              <span className="line-clamp-2 text-[10px] font-semibold leading-tight text-white">
                {g.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const ChallengeDetails: FC<{
  c: Challenge;
  busy: boolean;
  onClose: () => void;
  onJoin: () => void;
  onClaim: () => void;
  onCancel: () => void;
  onPlay: (key: string) => void;
}> = ({ c, busy, onClose, onJoin, onClaim, onCancel, onPlay }) => (
  <div className="fixed inset-0 z-50 flex justify-end">
    <button
      aria-label="Close"
      onClick={onClose}
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
    />
    <div className="relative h-full w-full max-w-md overflow-y-auto bg-slate-950 p-5 shadow-2xl ring-1 ring-white/10 animate-fade-in-right">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-white">
          Challenge Details
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="mt-3">
        <Countdown end={c.end_date} />
      </div>

      {/* Reward banner */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-900 p-4 ring-1 ring-white/10">
        <Gift size={28} className="text-violet-300" />
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Reward
          </div>
          <div className="text-base font-bold text-white">
            {c.reward_label}
          </div>
          <div className="text-xs uppercase tracking-wide text-slate-400 mt-1">
            Target: {c.condition_label}
          </div>
        </div>
      </div>

      {/* Challenge */}
      <div className="mt-5 flex items-center gap-2 text-slate-200">
        <Target size={16} className="text-violet-300" />
        <span className="font-semibold">Challenge</span>
      </div>
      <div className="mt-2 divide-y divide-white/5 rounded-2xl bg-slate-900 px-4 ring-1 ring-white/10">
        <Row
          label="Status"
          value={
            <span
              className={`rounded-full px-2 py-0.5 text-xs ring-1 ${STATUS_PILL[c.status]}`}
            >
              {STATUS_LABEL[c.status]}
            </span>
          }
        />
        <Row label="Reward" value={c.reward_amount} />
        <Row label="Reward type" value={c.reward_type} />
        <Row label="Category" value={c.provider ?? c.category} />
        <Row label="Target Condition" value={c.condition_label} />
        {c.min_bet != null && <Row label="Min bet" value={`$${c.min_bet}`} />}
        {c.eligible_currencies.length > 0 && (
          <Row label="Currencies" value={c.eligible_currencies.join(", ")} />
        )}
        {c.games.length > 0 && (
          <Row label="Games" value={`(${c.games.length})`} />
        )}
      </div>

      {/* Progress */}
      {(c.status === "IN_PROGRESS" || c.status === "COMPLETED") && (
        <div className="mt-4 rounded-2xl bg-slate-900 p-4 ring-1 ring-white/10">
          <div className="mb-2 flex justify-between text-xs text-slate-400">
            <span>Progress</span>
            <span>
              {c.progress}/{c.target}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              style={{ width: `${pct(c)}%` }}
            />
          </div>
        </div>
      )}

      {c.status === "CLAIMED" ? (
        <div className="rounded-xl bg-indigo-500/10 py-3 text-center text-sm font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
          {c.status}
        </div>
      ) : (
        <ChallengeGames games={c.games} onPlay={onPlay} />
      )}

      {/* Actions */}
      <div className="sticky bottom-0 mt-6 -mx-5 border-t border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur">
        {c.status === "AVAILABLE" && (
          <button
            disabled={busy}
            onClick={onJoin}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white transition-all hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
          >
            {busy ? "Joining…" : "Join Challenge"}
          </button>
        )}
        {c.status === "IN_PROGRESS" && (
          <div className="flex gap-2">
            {c.games.length > 0 && (
              <button
                disabled={busy}
                onClick={() => onPlay(c.games[0])}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-3 text-sm font-bold text-white transition-all hover:from-rose-500 hover:to-rose-400 disabled:opacity-50"
              >
                <Play size={16} fill="currentColor" /> Start Playing
              </button>
            )}
            <button
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-rose-300 ring-1 ring-rose-500/20 transition-all hover:bg-slate-700 disabled:opacity-50"
            >
              {busy ? "…" : "Cancel"}
            </button>
          </div>
        )}
        {c.status === "COMPLETED" && (
          <button
            disabled={busy}
            onClick={onClaim}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Claiming…" : "Claim Reward"}
          </button>
        )}
        {c.status === "CLAIMED" && (
          <div className="rounded-xl bg-indigo-500/10 py-3 text-center text-sm font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
            Reward claimed — see your Rewards tab
          </div>
        )}
      </div>
    </div>
  </div>
);
