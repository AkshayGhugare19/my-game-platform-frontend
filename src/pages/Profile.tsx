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
              <span>Level {p.progress.level} progress</span>
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
