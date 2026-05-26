import { useEffect, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import { useSocket } from "@/context/SocketContext";
import type { GamificationProfile, LevelTier } from "@/types";

const rankAccent: Record<string, { ring: string; text: string; bg: string; chip: string }> = {
  BRONZE: {
    ring: "ring-amber-700/50",
    text: "text-amber-500",
    bg: "from-amber-900/40 to-amber-700/10",
    chip: "bg-amber-700/20 text-amber-300 border-amber-700/40",
  },
  SILVER: {
    ring: "ring-slate-400/50",
    text: "text-slate-200",
    bg: "from-slate-500/30 to-slate-400/5",
    chip: "bg-slate-400/20 text-slate-100 border-slate-400/40",
  },
  GOLD: {
    ring: "ring-yellow-400/50",
    text: "text-yellow-300",
    bg: "from-yellow-600/30 to-yellow-400/5",
    chip: "bg-yellow-500/20 text-yellow-200 border-yellow-500/40",
  },
  PLATINUM: {
    ring: "ring-cyan-300/50",
    text: "text-cyan-200",
    bg: "from-cyan-700/30 to-cyan-400/5",
    chip: "bg-cyan-400/20 text-cyan-100 border-cyan-400/40",
  },
};

const fallbackAccent = {
  ring: "ring-indigo-400/50",
  text: "text-indigo-300",
  bg: "from-indigo-700/30 to-indigo-400/5",
  chip: "bg-indigo-500/20 text-indigo-200 border-indigo-500/40",
};

const accentFor = (code: string) => rankAccent[code] ?? fallbackAccent;

const prettyReward = (type: string | null, value: number | null) => {
  if (!type || value == null) return "—";
  return `${value} ${type.replace(/_/g, " ")}`;
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const LevelCard: FC<{ tier: LevelTier; isCurrent: boolean }> = ({ tier, isCurrent }) => {
  const accent = accentFor(tier.rankCode);
  const state = isCurrent ? "current" : tier.state;

  const stateLabel =
    state === "completed"
      ? "Completed"
      : state === "current"
        ? "Current"
        : "Locked";

  const stateChip =
    state === "completed"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
      : state === "current"
        ? "bg-indigo-500/30 text-indigo-100 border-indigo-400/50"
        : "bg-slate-800 text-slate-500 border-slate-700";

  return (
    <div
      className={`relative rounded-xl border p-4 bg-gradient-to-br ${accent.bg} ${
        state === "current"
          ? "border-indigo-400/60 shadow-lg shadow-indigo-500/10"
          : state === "completed"
            ? "border-emerald-700/40"
            : "border-slate-800"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ring-2 ${accent.ring} bg-slate-950/60 ${accent.text}`}
          >
            {tier.level}
          </div>
          <div>
            <div className="text-sm font-semibold">Level {tier.level}</div>
            <div className={`text-xs ${accent.text}`}>{tier.rankName}</div>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full border ${stateChip}`}>
          {stateLabel}
        </span>
      </div>

      <div className="text-xs text-slate-400 mt-2">
        {tier.xpStart} – {tier.xpEnd} XP
      </div>
      <div className="text-xs text-slate-300 mt-1">
        🎁 Reward: <span className="font-medium">{prettyReward(tier.rewardType, tier.rewardValue)}</span>
      </div>
    </div>
  );
};

const RankProgress: FC = () => {
  const [p, setP] = useState<GamificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();

  const load = async () => {
    const r = await endpoints.profile.get();
    if (r?.success && r.data) setP(r.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const off = on("xp:awarded", () => load());
    return off;
  }, [on]);

  if (loading) {
    return (
      <DashboardLayout>
        <h1 className="text-2xl font-bold mb-6">Rank Progress</h1>
        <div className="text-slate-400">Loading…</div>
      </DashboardLayout>
    );
  }

  if (!p) {
    return (
      <DashboardLayout>
        <h1 className="text-2xl font-bold mb-6">Rank Progress</h1>
        <div className="text-slate-400">No profile data available.</div>
      </DashboardLayout>
    );
  }

  const currentAccent = accentFor(p.rank.code);

  // Order of ranks for the ladder, derived from levels (low → high).
  const rankOrder: string[] = [];
  for (const tier of p.levels) {
    if (!rankOrder.includes(tier.rankCode)) rankOrder.push(tier.rankCode);
  }
  const currentRankIdx = rankOrder.indexOf(p.rank.code);

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Rank Progress</h1>
          <p className="text-slate-400 text-sm mt-1">
            Climb levels to unlock the next rank and its rewards.
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg border ${currentAccent.chip}`}>
          Current rank: <b>{p.rank.name}</b> · Level {p.level}
        </div>
      </div>

      {/* --- Headline progress card --- */}
      <div
        className={`relative rounded-2xl border border-slate-800 p-6 mb-6 bg-gradient-to-br ${currentAccent.bg}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div>
            <div className="text-xs text-slate-400 uppercase">Total XP</div>
            <div className="text-2xl font-bold text-indigo-300 mt-1">{p.xpTotal}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase">Level</div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">
              {p.level}
              <span className="text-sm text-slate-400 font-normal"> / {p.maxLevel}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase">Rank</div>
            <div className={`text-2xl font-bold mt-1 ${currentAccent.text}`}>
              {p.rank.name}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase">Streak</div>
            <div className="text-2xl font-bold text-amber-300 mt-1">
              🔥 {p.streak.current}
              <span className="text-sm text-slate-400 font-normal">
                {" "}/ longest {p.streak.longest}
              </span>
            </div>
          </div>
        </div>

        {/* Level progress bar */}
        <div className="mb-2 flex flex-wrap justify-between text-sm">
          <span>
            Level {p.progress.level} progress
          </span>
          <span className="text-slate-400">
            {p.progress.xpIntoLevel} XP
            {p.progress.nextLevelXp != null
              ? ` → ${p.progress.nextLevelXp} XP`
              : " (max)"}
            {" "}
            <span className="text-indigo-300 font-medium">
              ({p.progress.progressPct}%)
            </span>
          </span>
        </div>
        <div className="h-3 bg-slate-800/80 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
            style={{ width: `${p.progress.progressPct}%` }}
          />
        </div>

        {p.nextRank ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-400">Next rank:</span>
            <span className={`font-semibold ${accentFor(p.nextRank.code).text}`}>
              {p.nextRank.name}
            </span>
            <span className="text-slate-500">·</span>
            <span>
              <b className="text-indigo-300">{p.nextRank.xpRemaining}</b> XP to go
            </span>
            <span className="text-slate-500">·</span>
            <span>
              Unlock reward:{" "}
              <span className="text-amber-300 font-medium">
                {prettyReward(p.nextRank.rewardType, p.nextRank.rewardValue)}
              </span>
            </span>
          </div>
        ) : (
          <div className="mt-4 text-emerald-400 text-sm">
            🎉 You have reached the max rank!
          </div>
        )}
      </div>

      {/* --- Rank ladder --- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Rank Ladder</h2>
          <span className="text-xs text-slate-500">low → high</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {rankOrder.map((code, idx) => {
            const meta = p.ranks.find((r) => r.code === code);
            const reached = idx <= currentRankIdx;
            const isCurrent = idx === currentRankIdx;
            const accent = accentFor(code);
            return (
              <div
                key={code}
                className={`relative rounded-xl p-4 border bg-gradient-to-br ${accent.bg} ${
                  isCurrent
                    ? "border-indigo-400/70 shadow-lg shadow-indigo-500/10"
                    : reached
                      ? "border-emerald-700/40"
                      : "border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`text-sm font-bold ${accent.text}`}>
                    {meta?.name ?? code}
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      isCurrent
                        ? "bg-indigo-500/30 text-indigo-100 border-indigo-400/50"
                        : reached
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-slate-800 text-slate-500 border-slate-700"
                    }`}
                  >
                    {isCurrent ? "Current" : reached ? "Unlocked" : "Locked"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {meta?.description ?? "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Levels roadmap --- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Levels Roadmap</h2>
          <span className="text-xs text-slate-500">
            {p.levels.filter((l) => l.state === "completed").length} / {p.levels.length}{" "}
            completed
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {p.levels.map((tier) => (
            <LevelCard key={tier.level} tier={tier} isCurrent={tier.level === p.level} />
          ))}
        </div>
      </div>

      {/* --- Activity log --- */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Activity</h2>
          <span className="text-xs text-slate-500">{p.logs.length} entries</span>
        </div>
        {p.logs.length === 0 ? (
          <div className="text-slate-500 text-sm">No activity yet.</div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {p.logs.map((log) => (
              <li key={log.id} className="py-3 flex flex-wrap justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{log.action}</div>
                  <div className="text-xs text-slate-400">{log.detail}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">{formatDate(log.created_at)}</div>
                  <div className="text-[10px] uppercase text-slate-600">by {log.actor}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RankProgress;
