import { useEffect, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints, { type XpHistoryRow } from "@/services/endpoints";
import type { GamificationProfile } from "@/types";

const initials = (a: string, b: string) =>
  `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase() || "?";

const StatCard: FC<{
  label: string;
  value: string | number;
  accent: string;
}> = ({ label, value, accent }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
    <div className="text-slate-400 text-xs uppercase tracking-wide">
      {label}
    </div>
    <div className={`text-2xl font-bold mt-1 ${accent}`}>{value}</div>
  </div>
);

const Profile: FC = () => {
  const [p, setP] = useState<GamificationProfile | null>(null);
  const [xp, setXp] = useState<XpHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pr, hist] = await Promise.all([
          endpoints.profile.get(),
          endpoints.profile.xpHistory(1, 15),
        ]);
        if (pr?.success && pr.data) setP(pr.data);
        if (hist?.success && hist.data) setXp(hist.data.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      {loading && (
        <div className="text-slate-500 py-10 text-center">Loading profile…</div>
      )}

      {!loading && p && (
        <>
          {/* Identity header */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6 flex items-center gap-5">
            <div className="h-16 w-16 shrink-0 rounded-full bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-xl font-bold text-indigo-300">
              {initials(p.user.first_name, p.user.last_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold truncate">
                {p.user.first_name} {p.user.last_name}
              </div>
              <div className="text-slate-400 text-sm truncate">
                {p.user.email}
              </div>
            </div>
            <span className="shrink-0 text-xs font-medium px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {p.rank.name}
            </span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total XP" value={p.xpTotal} accent="text-indigo-400" />
            <StatCard label="Level" value={p.level} accent="text-emerald-400" />
            <StatCard label="Rank" value={p.rank.name} accent="text-amber-400" />
            <StatCard label="Coins" value={p.coins} accent="text-yellow-300" />
          </div>

          {/* Level progress */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>
                Level {p.progress.level}
                {p.maxLevel ? ` / ${p.maxLevel}` : ""} progress
              </span>
              <span className="text-slate-400">
                {p.progress.xpIntoLevel} XP
                {p.progress.nextLevelXp !== null
                  ? ` / ${p.progress.nextLevelXp} XP`
                  : " (max level)"}
              </span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all"
                style={{ width: `${p.progress.progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>{p.progress.progressPct}% complete</span>
              <span>
                🔥 Streak: {p.streak.current} day(s) · Longest{" "}
                {p.streak.longest}
              </span>
            </div>
          </div>

          {/* Next rank */}
          {p.nextRank && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Next rank</h2>
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  {p.nextRank.name}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Reach{" "}
                <span className="text-slate-200 font-medium">
                  level {p.nextRank.level}
                </span>{" "}
                ({p.nextRank.xpRequired} XP) —{" "}
                <span className="text-amber-400 font-medium">
                  {p.nextRank.xpRemaining} XP to go
                </span>
                .
              </p>
              {p.nextRank.rewardType && (
                <p className="text-xs text-slate-500 mt-1">
                  Unlock reward: {p.nextRank.rewardValue ?? ""}{" "}
                  {p.nextRank.rewardType.replace(/_/g, " ")}
                </p>
              )}
            </div>
          )}

          {/* Level roadmap */}
          {p.levels.length > 0 && (
            <>
              <h2 className="font-semibold mb-3">Level Roadmap</h2>
              <div className="space-y-2 mb-6">
                {p.levels.map((l) => (
                  <div
                    key={`${l.rankCode}-${l.level}`}
                    className={`flex items-center justify-between p-4 rounded-xl border ${
                      l.state === "current"
                        ? "border-amber-400 bg-amber-500/10"
                        : l.state === "completed"
                          ? "border-emerald-700 bg-emerald-500/5"
                          : "border-slate-800 bg-slate-900"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">
                        Level {l.level} · {l.rankName}{" "}
                        {l.state === "current" && (
                          <span className="text-amber-400">← you</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {l.xpStart}–{l.xpEnd} XP
                        {l.rewardType
                          ? ` · reward: ${l.rewardValue ?? ""} ${l.rewardType.replace(
                              /_/g,
                              " "
                            )}`
                          : ""}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        l.state === "locked"
                          ? "bg-slate-800 text-slate-500"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {l.state === "locked" ? "Locked" : "Unlocked"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Recent activity (Hamara gamification logs) */}
          {p.logs.length > 0 && (
            <>
              <h2 className="font-semibold mb-3">Recent Activity</h2>
              <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 mb-6">
                {p.logs.map((l) => (
                  <div
                    key={l.id}
                    className="p-4 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{l.action}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {l.detail}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 shrink-0 text-right">
                      <div>{new Date(l.created_at).toLocaleString()}</div>
                      <div>by {l.actor}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* XP history */}
          <h2 className="font-semibold mb-3">XP History</h2>
          <div className="border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900">
                <tr>
                  <th className="p-3 text-left">Source</th>
                  <th className="p-3 text-left">Rule</th>
                  <th className="p-3 text-right">XP</th>
                  <th className="p-3 text-right">Balance</th>
                  <th className="p-3 text-left">When</th>
                </tr>
              </thead>
              <tbody>
                {xp.map((x) => (
                  <tr key={x.id} className="border-t border-slate-800">
                    <td className="p-3">{x.source}</td>
                    <td className="p-3">{x.rule_code ?? "—"}</td>
                    <td className="p-3 text-right text-emerald-400">
                      +{x.xp_amount}
                    </td>
                    <td className="p-3 text-right">{x.balance_after}</td>
                    <td className="p-3 text-slate-400">
                      {new Date(x.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {xp.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 text-center text-slate-500"
                    >
                      No XP earned yet — play a game from the Dashboard to
                      start earning.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && !p && (
        <div className="text-slate-500 py-10 text-center">
          Couldn’t load your profile. Please try again later.
        </div>
      )}
    </DashboardLayout>
  );
};

export default Profile;
