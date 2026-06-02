import { useCallback, useEffect, useState, type FC } from "react";
import { NavLink } from "react-router-dom";
import {
  Sparkles,
  TrendingUp,
  Medal,
  Coins,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import { useSocket } from "@/context/SocketContext";
import type { GamificationProfile } from "@/types";

const Stat: FC<{
  label: string;
  value: string | number;
  accent?: string;
  icon: LucideIcon;
  delay?: string;
}> = ({ label, value, accent = "text-indigo-400", icon: Icon, delay = "" }) => (
  <div
    className={`card-interactive group relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/40 p-5 animate-fade-in-up ${delay}`}
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
      <h1 className="text-2xl font-bold mb-1 animate-fade-in-down">Dashboard</h1>
      <p className="text-slate-400 mb-6 animate-fade-in-down">
        Your progression at a glance — jump into a game to earn XP.
      </p>

      {p && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Stat label="Total XP" value={p.xpTotal} icon={Sparkles} />
            <Stat
              label="Level"
              value={p.level}
              accent="text-emerald-400"
              icon={TrendingUp}
              delay="stagger-1"
            />
            <Stat
              label="Rank"
              value={p.rank.name}
              accent="text-amber-400"
              icon={Medal}
              delay="stagger-2"
            />
            <Stat
              label="Coins"
              value={p.coins}
              accent="text-yellow-300"
              icon={Coins}
              delay="stagger-3"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 animate-fade-in-up stagger-4">
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
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 shadow-[0_0_12px_rgba(99,102,241,0.6)] transition-all duration-700"
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

          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 via-slate-900 to-fuchsia-900/20 bg-[length:200%_200%] p-6 flex flex-wrap items-center justify-between gap-3 animate-fade-in-up stagger-5 animate-gradient-x">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl animate-float" />
            <div className="relative">
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Gamepad2 size={20} className="text-indigo-300" /> Ready to earn
                XP?
              </div>
              <p className="text-slate-300 text-sm mt-1">
                Pick a mini game — Slider, Lucky Spinner, Dragon Run and more.
              </p>
            </div>
            <NavLink
              to="/games"
              className="btn-primary relative px-5 py-2.5 text-sm"
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
