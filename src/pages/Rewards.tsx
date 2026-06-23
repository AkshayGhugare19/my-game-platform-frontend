import { useCallback, useEffect, useState, type FC } from "react";
import { toast } from "react-toastify";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import Pagination from "@/components/Pagination";
import type { UserReward } from "@/types";

const titleCase = (s: string) =>
  s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const Rewards: FC = () => {
  const [rewards, setRewards] = useState<UserReward[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const r = await endpoints.rewards.list(page);
    if (r?.success && r.data) {
      setRewards(r.data.data);
      setTotalPages(r.data.pagination.totalPages);
      setTotal(r.data.pagination.total);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClaim = async (row: UserReward) => {
    const id = row.id;
    if (claiming) return;
    setClaiming(id);
    try {
      // Locally-granted bonuses claim through /bonuses/:id/claim (credits the
      // RM/BM wallet); GAMRU-sourced rewards claim through /rewards/:id/claim.
      const r = row.is_bonus
        ? await endpoints.bonuses.claim(id)
        : await endpoints.rewards.claim(id);
      if (r?.success) {
        toast.success(r.message || "Reward claimed");
        await load();
      } else {
        toast.error(r?.message || "Failed to claim reward");
      }
    } catch (e) {
      toast.error((e as { message?: string })?.message || "Failed to claim reward");
    } finally {
      setClaiming(null);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6 animate-fade-in-down">
        🎁 My Rewards
      </h1>
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-400 uppercase text-xs tracking-wide">
            <tr>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Granted Date</th>
              <th className="p-3 text-left font-medium">Source</th>
              <th className="p-3 text-left font-medium">Reward Type</th>
              <th className="p-3 text-left font-medium">Reward</th>
              <th className="p-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r, i) => {
              const status = String(r.status ?? "").toUpperCase();
              const isPending = status === "IN_PROGRESS";
              return (
                <tr
                  key={r.id}
                  style={{ animationDelay: `${i * 35}ms` }}
                  className="border-t border-slate-800 transition-colors hover:bg-slate-800/40 animate-fade-in"
                >
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
                  <td className="p-3 text-right">
                    {isPending ? (
                      <button
                        onClick={() => handleClaim(r)}
                        disabled={claiming === r.id}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        {claiming === r.id ? "Claiming…" : "Claim"}
                      </button>
                    ) : (
                      <span className="text-slate-500 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rewards.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No rewards yet — climb ranks and complete missions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

export default Rewards;
