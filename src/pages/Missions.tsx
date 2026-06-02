import { useCallback, useEffect, useState, type FC } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import Pagination from "@/components/Pagination";
import type { ApiError, Mission } from "@/types";

const statusColor: Record<string, string> = {
  IN_PROGRESS: "bg-slate-700 text-slate-300",
  COMPLETED: "bg-emerald-500/20 text-emerald-400",
  CLAIMED: "bg-indigo-500/20 text-indigo-400",
  EXPIRED: "bg-red-500/20 text-red-400",
  LOCKED: "bg-slate-800 text-slate-500",
};

const Missions: FC = () => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const r = await endpoints.missions.list(page);
    if (r?.success && r.data) {
      setMissions(r.data.data);
      setTotalPages(r.data.pagination.totalPages);
      setTotal(r.data.pagination.total);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const claim = async (id: string) => {
    try {
      const r = await endpoints.missions.claim(id);
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
      <h1 className="text-2xl font-bold mb-6">Missions</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {missions.map((m) => {
          const pct = Math.min(
            100,
            Math.round((m.progress / m.target) * 100)
          );
          return (
            <div
              key={m.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-slate-400">
                    {m.type} · {m.metric}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    statusColor[m.status]
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-2">
                <span>
                  {m.progress}/{m.target}
                </span>
                <span>
                  +{m.reward_xp} XP · +{m.reward_coins} 🪙
                </span>
              </div>
              {m.status === "COMPLETED" && (
                <button
                  onClick={() => claim(m.id)}
                  className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-sm"
                >
                  Claim reward
                </button>
              )}
            </div>
          );
        })}
        {missions.length === 0 && (
          <p className="text-slate-500">No missions yet.</p>
        )}
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        onChange={setPage}
      />
    </DashboardLayout>
  );
};

export default Missions;
