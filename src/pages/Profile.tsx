import { useEffect, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints, { type XpHistoryRow } from "@/services/endpoints";
import Pagination from "@/components/Pagination";
import type { GamificationProfile } from "@/types";
import {
  Sparkles,
  TrendingUp,
  Medal,
  Coins,
  type LucideIcon,
} from "lucide-react";

const initials = (a: string, b: string) =>
  `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase() || "?";

const StatCard: FC<{
  label: string;
  value: string | number;
  accent: string;
  icon: LucideIcon;
  glow: string;
}> = ({ label, value, accent, icon: Icon, glow }) => (
  <div
    className={`group relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/40 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-lg ${glow}`}
  >
    <div
      className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-25 ${accent.replace(
        "text-",
        "bg-"
      )}`}
    />
    <div className="flex items-center justify-between">
      <div className="text-slate-400 text-xs uppercase tracking-wide">
        {label}
      </div>
      <Icon size={18} className={`${accent} opacity-70`} />
    </div>
    <div className={`text-2xl font-bold mt-2 ${accent}`}>{value}</div>
  </div>
);

type TabKey = "roadmap" | "activity" | "xp";

const TABS: { key: TabKey; label: string }[] = [
  { key: "roadmap", label: "Level Roadmap" },
  { key: "activity", label: "Recent Activity" },
  { key: "xp", label: "XP History" },
];

const Profile: FC = () => {
  const [p, setP] = useState<GamificationProfile | null>(null);
  const [xp, setXp] = useState<XpHistoryRow[]>([]);
  const [xpPage, setXpPage] = useState(1);
  const [xpMeta, setXpMeta] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("roadmap");

  useEffect(() => {
    (async () => {
      try {
        const pr = await endpoints.profile.get();
        if (pr?.success && pr.data) setP(pr.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const hist = await endpoints.profile.xpHistory(xpPage, 15);
      if (hist?.success && hist.data) {
        setXp(hist.data.data);
        setXpMeta(hist.data.pagination);
      }
    })();
  }, [xpPage]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
        Profile
      </h1>

      {loading && (
        <div className="text-slate-500 py-10 text-center">Loading profile…</div>
      )}

      {!loading && p && (
        <>
          {/* Identity header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/30 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 flex items-center gap-5">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="relative h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400/40">
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
            <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Medal size={13} />
              {p.rank.name}
            </span>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total XP"
              value={p.xpTotal}
              accent="text-indigo-400"
              icon={Sparkles}
              glow="hover:shadow-indigo-500/10"
            />
            <StatCard
              label="Level"
              value={p.level}
              accent="text-emerald-400"
              icon={TrendingUp}
              glow="hover:shadow-emerald-500/10"
            />
            <StatCard
              label="Rank"
              value={p.rank.name}
              accent="text-amber-400"
              icon={Medal}
              glow="hover:shadow-amber-500/10"
            />
            <StatCard
              label="Coins"
              value={p.coins}
              accent="text-yellow-300"
              icon={Coins}
              glow="hover:shadow-yellow-500/10"
            />
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
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] transition-all duration-500"
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
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-slate-800 rounded-2xl p-5 mb-6">
              <div className="pointer-events-none absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-indigo-500/5 blur-2xl" />
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

          {/* Tabs */}
          <div className="mb-6 inline-flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  tab === t.key
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Level roadmap */}
          {tab === "roadmap" &&
            (p.levels.length > 0 ? (
              <div className="space-y-2 mb-6">
                {p.levels.map((l) => (
                  <div
                    key={`${l.rankCode}-${l.level}`}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:-translate-y-0.5 ${
                      l.state === "current"
                        ? "border-amber-400 bg-amber-500/10 shadow-md shadow-amber-500/10"
                        : l.state === "completed"
                          ? "border-emerald-700 bg-emerald-500/5 hover:border-emerald-600"
                          : "border-slate-800 bg-slate-900 hover:border-slate-700"
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
            ) : (
              <div className="text-slate-500 py-10 text-center">
                No level roadmap available yet.
              </div>
            ))}

          {/* Recent activity (Hamara gamification logs) */}
          {tab === "activity" &&
            (p.logs.length > 0 ? (
              <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 mb-6 overflow-hidden">
                {p.logs.map((l) => (
                  <div
                    key={l.id}
                    className="p-4 flex items-start justify-between gap-4 transition-colors hover:bg-slate-800/40"
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
            ) : (
              <div className="text-slate-500 py-10 text-center">
                No recent activity yet.
              </div>
            ))}

          {/* XP history */}
          {tab === "xp" && (
            <>
              <div className="border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-xs tracking-wide">
                    <tr>
                      <th className="p-3 text-left font-medium">Source</th>
                      <th className="p-3 text-left font-medium">Rule</th>
                      <th className="p-3 text-right font-medium">XP</th>
                      <th className="p-3 text-right font-medium">Balance</th>
                      <th className="p-3 text-left font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xp.map((x) => (
                      <tr
                        key={x.id}
                        className="border-t border-slate-800 transition-colors hover:bg-slate-800/40"
                      >
                        <td className="p-3 font-medium">{x.source}</td>
                        <td className="p-3 text-slate-400">
                          {x.rule_code ?? "—"}
                        </td>
                        <td className="p-3 text-right font-semibold text-emerald-400">
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
              <Pagination
                page={xpPage}
                totalPages={xpMeta.totalPages}
                total={xpMeta.total}
                onChange={setXpPage}
              />
            </>
          )}
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
