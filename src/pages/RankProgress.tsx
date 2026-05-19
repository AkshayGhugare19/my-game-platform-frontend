import { useEffect, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import apiService from "@/services/api";
import endpoints from "@/services/endpoints";
import type { GamificationProfile } from "@/types";

interface RankTier {
  code: string;
  name: string;
  min_level: number;
  min_xp: number;
  order: number;
}

const RankProgress: FC = () => {
  const [ranks, setRanks] = useState<RankTier[]>([]);
  const [p, setP] = useState<GamificationProfile | null>(null);

  useEffect(() => {
    (async () => {
      const [rk, pr] = await Promise.all([
        apiService.get<RankTier[]>("/ranks"),
        endpoints.profile.get(),
      ]);
      if (rk?.success && rk.data) setRanks(rk.data);
      if (pr?.success && pr.data) setP(pr.data);
    })();
  }, []);

  const currentOrder =
    ranks.find((r) => r.code === p?.rank.code)?.order ?? 0;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Rank Progress</h1>
      <div className="space-y-3">
        {ranks.map((r) => {
          const reached = r.order <= currentOrder;
          const current = r.code === p?.rank.code;
          return (
            <div
              key={r.code}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                current
                  ? "border-amber-400 bg-amber-500/10"
                  : reached
                    ? "border-emerald-700 bg-emerald-500/5"
                    : "border-slate-800 bg-slate-900"
              }`}
            >
              <div>
                <div className="font-semibold">
                  {r.name} {current && "← you"}
                </div>
                <div className="text-xs text-slate-400">
                  Requires level {r.min_level} · {r.min_xp} XP
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  reached
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {reached ? "Unlocked" : "Locked"}
              </span>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default RankProgress;
