import { useCallback, useEffect, useState, type FC } from "react";
import { NavLink } from "react-router-dom";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import { useSocket } from "@/context/SocketContext";
import type { GamificationProfile } from "@/types";

const Stat: FC<{ label: string; value: string | number; accent?: string }> = ({
  label,
  value,
  accent = "text-indigo-400",
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
    <div className="text-slate-400 text-xs uppercase">{label}</div>
    <div className={`text-2xl font-bold mt-1 ${accent}`}>{value}</div>
  </div>
);

const Dashboard: FC = () => {
  const [p, setP] = useState<GamificationProfile | null>(null);
  const { on } = useSocket();

  const load = useCallback(async () => {
    const r = await endpoints.profile.get();
    if (r?.success && r.data) setP(r.data);
  }, []);

  useEffect(() => {
    load();
    const off = on("xp:awarded", () => load());
    return off;
  }, [load, on]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-slate-400 mb-6">
        Your progression at a glance — jump into a game to earn XP.
      </p>

      {p && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Stat label="Total XP" value={p.xpTotal} />
            <Stat label="Level" value={p.level} accent="text-emerald-400" />
            <Stat label="Rank" value={p.rank.name} accent="text-amber-400" />
            <Stat label="Coins" value={p.coins} accent="text-yellow-300" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>
                Level {p.progress.level}
                {p.maxLevel ? ` / ${p.maxLevel}` : ""} progress
              </span>
              <span className="text-slate-400">
                {p.progress.xpIntoLevel} XP
                {p.progress.nextLevelXp
                  ? ` → ${p.progress.nextLevelXp} XP`
                  : " (max)"}
              </span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all"
                style={{ width: `${p.progress.progressPct}%` }}
              />
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500 mt-2">
              <span>
                🔥 Streak: {p.streak.current} day(s) · Longest {p.streak.longest}
              </span>
              {p.nextRank ? (
                <span>
                  Next:{" "}
                  <span className="text-indigo-300 font-medium">
                    {p.nextRank.name}
                  </span>{" "}
                  · {p.nextRank.xpRemaining} XP to go
                  {p.nextRank.rewardType
                    ? ` · reward ${p.nextRank.rewardValue ?? ""} ${p.nextRank.rewardType.replace(
                        /_/g,
                        " "
                      )}`
                    : ""}
                </span>
              ) : (
                <span className="text-emerald-400">Max rank reached 🎉</span>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">🎮 Ready to earn XP?</div>
              <p className="text-slate-400 text-sm mt-1">
                Pick a mini game — Slider, Lucky Spinner, Dragon Run and more.
              </p>
            </div>
            <NavLink
              to="/games"
              className="bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 rounded-lg font-medium text-sm"
            >
              Browse games →
            </NavLink>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
