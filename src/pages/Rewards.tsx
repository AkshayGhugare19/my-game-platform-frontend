import { useCallback, useEffect, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import apiService from "@/services/api";
import type { UserReward } from "@/types";

const titleCase = (s: string) =>
  s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const Rewards: FC = () => {
  const [rewards, setRewards] = useState<UserReward[]>([]);

  const load = useCallback(async () => {
    const r = await apiService.get<UserReward[]>("/rewards");
    if (r?.success && r.data) setRewards(r.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">My Rewards</h1>
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Granted Date</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Reward Type</th>
              <th className="p-3 text-left">Reward</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-3">{titleCase(String(r.status ?? ""))}</td>
                <td className="p-3 text-slate-400">
                  {r.granted_date
                    ? new Date(r.granted_date).toLocaleString()
                    : "—"}
                </td>
                <td className="p-3">
                  {r.is_manual
                    ? "Manual"
                    : titleCase(String(r.gamification_source ?? "—"))}
                </td>
                <td className="p-3">{r.reward_type ?? "—"}</td>
                <td className="p-3">{r.reward ?? "—"}</td>
              </tr>
            ))}
            {rewards.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No rewards yet — climb ranks and complete missions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};

export default Rewards;
