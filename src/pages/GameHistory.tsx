import { useEffect, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import apiService from "@/services/api";
import Pagination from "@/components/Pagination";
import type { PaginatedData } from "@/types";

interface ActivityRow {
  id: string;
  type: string;
  game_id: string | null;
  created_at: string;
}

const GameHistory: FC = () => {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      const r = await apiService.get<PaginatedData<ActivityRow>>(
        "/activity/game-history",
        { page, limit: 10 }
      );
      if (r?.success && r.data) {
        setRows(r.data.data);
        setTotalPages(r.data.pagination.totalPages);
        setTotal(r.data.pagination.total);
      }
    })();
  }, [page]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Game History</h1>
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Game</th>
              <th className="p-3 text-left">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-3">{r.type}</td>
                <td className="p-3">{r.game_id ?? "—"}</td>
                <td className="p-3 text-slate-400">
                  {new Date(r.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-slate-500">
                  No activity yet.
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

export default GameHistory;
