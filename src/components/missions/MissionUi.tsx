import { useState, type FC } from "react";
import {
  ChevronRight,
  Crown,
  Dice5,
  Gift,
  Play,
  Target,
  X,
} from "lucide-react";
import { gameMeta } from "@/config/gamesCatalog";
import type { Mission, MissionStatus } from "@/types";

/**
 * Shared, presentation-only mission UI. Used by both the Missions page and the
 * Mission Bundles page so a mission renders and behaves identically wherever it
 * appears — the pages own the data loading + join/claim/cancel callbacks.
 */

export const STATUS_PILL: Record<MissionStatus, string> = {
  AVAILABLE: "text-slate-300 bg-slate-700/60 ring-slate-500/30",
  IN_PROGRESS: "text-amber-300 bg-amber-500/15 ring-amber-500/30",
  COMPLETED: "text-emerald-300 bg-emerald-500/15 ring-emerald-500/30",
  CLAIMED: "text-indigo-300 bg-indigo-500/15 ring-indigo-500/30",
};

export const STATUS_LABEL: Record<MissionStatus, string> = {
  AVAILABLE: "Available",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CLAIMED: "Claimed",
};

export const pct = (m: Mission) =>
  m.target > 0 ? Math.min(100, Math.round((m.progress / m.target) * 100)) : 0;

/** Card thumbnail with a graceful gradient fallback when the image is missing. */
export const Thumb: FC<{ m: Mission; size?: number }> = ({ m, size = 72 }) => {
  const [broken, setBroken] = useState(false);
  const show = m.large_image && !broken;
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
          src={m.large_image as string}
          alt={m.name}
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : /sport/i.test(m.bucket) ? (
        <Dice5 size={size * 0.4} className="text-white/40" />
      ) : (
        <Target size={size * 0.4} className="text-white/40" />
      )}
    </div>
  );
};

export const MissionCard: FC<{ m: Mission; onOpen: () => void }> = ({
  m,
  onOpen,
}) => (
  <button
    onClick={onOpen}
    className="group flex w-full items-stretch gap-3 rounded-2xl bg-slate-900/80 p-3 text-left ring-1 ring-white/10 transition-all hover:-translate-y-0.5 hover:ring-violet-500/30"
  >
    <Thumb m={m} />
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center gap-2">
        {m.duration_days != null && (
          <span className="rounded-full bg-slate-700/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
            {m.duration_days} Days
          </span>
        )}
        {m.vip && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 ring-1 ring-amber-500/30">
            <Crown size={10} /> VIP
          </span>
        )}
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_PILL[m.status]}`}
        >
          {STATUS_LABEL[m.status]}
        </span>
      </div>
      <div className="truncate text-sm font-semibold text-slate-100">
        Name: {m.name}
      </div>
      <div className="truncate text-sm font-semibold text-slate-100">
        Reward: {m.reward_amount} {m.reward_type}
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-800/70 px-2.5 py-1.5">
        <Gift size={14} className="shrink-0 text-violet-300" />
        <span className="text-[11px] text-slate-400">Reward:</span>
        <span className="truncate text-xs font-semibold text-slate-100">
          {m.reward_label}
        </span>
        <ChevronRight
          size={16}
          className="ml-auto shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5"
        />
      </div>
      {(m.status === "IN_PROGRESS" || m.status === "COMPLETED") && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
              style={{ width: `${pct(m)}%` }}
            />
          </div>
          <div className="mt-1 text-right text-[10px] text-slate-400">
            {m.progress}/{m.target}
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

const MissionGames: FC<{
  games: string[];
  onPlay: (key: string) => void;
}> = ({ games, onPlay }) => {
  if (games.length === 0) return null;
  return (
    <div className="mt-5">
      <div className="mb-2 font-semibold text-slate-200">Mission Games</div>
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

export const MissionDetails: FC<{
  m: Mission;
  busy: boolean;
  onClose: () => void;
  onJoin: () => void;
  onClaim: () => void;
  onCancel: () => void;
  onPlay: (key: string) => void;
  /** When set, a COMPLETED mission can't be claimed yet — shows this reason
   * instead of the Claim button (used by bundles: claim only when all done). */
  claimLockedReason?: string | null;
}> = ({
  m,
  busy,
  onClose,
  onJoin,
  onClaim,
  onCancel,
  onPlay,
  claimLockedReason = null,
}) => (
  <div className="fixed inset-0 z-50 flex justify-end">
    <button
      aria-label="Close"
      onClick={onClose}
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
    />
    <div className="relative h-full w-full max-w-md overflow-y-auto bg-slate-950 p-5 shadow-2xl ring-1 ring-white/10 animate-fade-in-right">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-white">Mission Details</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Reward banner */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-900 p-4 ring-1 ring-white/10">
        <Gift size={28} className="text-violet-300" />
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Reward
          </div>
          <div className="text-base font-bold text-white">
            {m.reward_label}
          </div>
          <div className="text-xs uppercase tracking-wide text-slate-400 mt-1">
            Target: {m.condition}
          </div>
        </div>
      </div>

      {/* Mission */}
      <div className="mt-5 flex items-center gap-2 text-slate-200">
        <Target size={16} className="text-violet-300" />
        <span className="font-semibold">Mission</span>
      </div>
      <div className="mt-2 divide-y divide-white/5 rounded-2xl bg-slate-900 px-4 ring-1 ring-white/10">
        <Row
          label="Status"
          value={
            <span
              className={`rounded-full px-2 py-0.5 text-xs ring-1 ${STATUS_PILL[m.status]}`}
            >
              {STATUS_LABEL[m.status]}
            </span>
          }
        />
        <Row label="Reward" value={m.reward_amount} />
        <Row label="Reward type" value={m.reward_type} />
        <Row label="Mission type" value={m.category} />
        <Row label="Target Condition" value={m.condition} />
        {m.min_bet != null && <Row label="Min bet" value={`$${m.min_bet}`} />}
        {m.min_multiplier != null && (
          <Row label="Min multiplier" value={`X${m.min_multiplier}`} />
        )}
        <Row label="Bet currency" value={m.bet_currency} />
        {m.games.length > 0 && (
          <Row label="Games" value={`(${m.games.length})`} />
        )}
        <Row label="Bonus wagering" value={m.bonus_wagering} />
      </div>

      {/* Progress */}
      {(m.status === "IN_PROGRESS" || m.status === "COMPLETED") && (
        <div className="mt-4 rounded-2xl bg-slate-900 p-4 ring-1 ring-white/10">
          <div className="mb-2 flex justify-between text-xs text-slate-400">
            <span>Progress</span>
            <span>
              {m.progress}/{m.target}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              style={{ width: `${pct(m)}%` }}
            />
          </div>
        </div>
      )}

      {/* Reward details */}
      <div className="mt-5 flex items-center gap-2 text-slate-200">
        <Gift size={16} className="text-violet-300" />
        <span className="font-semibold">Reward details</span>
      </div>
      <div className="mt-2 divide-y divide-white/5 rounded-2xl bg-slate-900 px-4 ring-1 ring-white/10">
        <Row label="Reward" value={m.reward_label} />
        <Row label="Deposit" value={m.deposit_required ? "Required" : "Not Required"} />
        <Row
          label="Wagering"
          value={m.wagering_required ? "Required" : "Not Required"}
        />
        {m.max_bonus != null && <Row label="Max bonus" value={`$${m.max_bonus}`} />}
      </div>

      {m.more_details && (
        <div className="my-5">
          <div className="mb-1 font-semibold text-slate-200">More details:</div>
          <p className="text-sm leading-relaxed text-slate-400">
            {m.more_details}
          </p>
        </div>
      )}
      {m.status === "CLAIMED" ?
        <div className={`rounded-xl bg-indigo-500/10 py-3 text-center text-sm font-semibold text-indigo-300 ring-1 ring-indigo-500/20`}>{m.status}</div>
        : <MissionGames games={m.games} onPlay={onPlay} />
      }

      {/* Actions */}
      <div className="sticky bottom-0 mt-6 -mx-5 border-t border-white/10 bg-slate-950/90 px-5 py-4 backdrop-blur">
        {m.status === "AVAILABLE" && (
          <button
            disabled={busy}
            onClick={onJoin}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3 text-sm font-bold text-white transition-all hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
          >
            {busy ? "Joining…" : "Join Mission"}
          </button>
        )}
        {m.status === "IN_PROGRESS" && (
          <div className="flex gap-2">
            {m.games.length > 0 && (
              <button
                disabled={busy}
                onClick={() => onPlay(m.games[0])}
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
        {m.status === "COMPLETED" &&
          (claimLockedReason ? (
            <div className="rounded-xl bg-slate-800/80 py-3 text-center text-sm font-semibold text-amber-300 ring-1 ring-amber-500/20">
              {claimLockedReason}
            </div>
          ) : (
            <button
              disabled={busy}
              onClick={onClaim}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy ? "Claiming…" : "Claim Reward"}
            </button>
          ))}
        {m.status === "CLAIMED" && (
          <div className="rounded-xl bg-indigo-500/10 py-3 text-center text-sm font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
            Reward claimed — see your Mission bundle card
          </div>
        )}
      </div>
    </div>
  </div>
);
