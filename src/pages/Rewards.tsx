import { useCallback, useEffect, useState, type FC } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "@/layout/DashboardLayout";
import apiService from "@/services/api";
import type { ApiError, UserReward } from "@/types";

const Rewards: FC = () => {
  const [rewards, setRewards] = useState<UserReward[]>([]);

  const load = useCallback(async () => {
    const r = await apiService.get<UserReward[]>("/rewards");
    if (r?.success && r.data) setRewards(r.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const claim = async (id: string) => {
    try {
      const r = await apiService.post(`/rewards/${id}/claim`);
      if (r?.success) {
        toast.success("Reward claimed!");
        load();
      } else toast.error(r?.message || "Cannot claim");
    } catch (e) {
      toast.error((e as ApiError)?.message || "Cannot claim");
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Rewards</h1>
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Expires</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-3">{r.source}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3">
                  {r.expires_at
                    ? new Date(r.expires_at).toLocaleDateString()
                    : "—"}
                </td>
                <td className="p-3">
                  {r.status === "GRANTED" ? (
                    <button
                      onClick={() => claim(r.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded text-xs"
                    >
                      Claim
                    </button>
                  ) : (
                    <span className="text-slate-500 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
            {rewards.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">
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
