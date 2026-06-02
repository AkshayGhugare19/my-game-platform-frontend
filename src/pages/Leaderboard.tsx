import { useEffect, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import Pagination from "@/components/Pagination";
import { useSocket } from "@/context/SocketContext";
import type { LeaderboardRow } from "@/types";

type Board = "global" | "weekly" | "monthly";

const Leaderboard: FC = () => {
  const [board, setBoard] = useState<Board>("global");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<LeaderboardRow | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { on } = useSocket();

  const switchBoard = (b: Board) => {
    setBoard(b);
    setPage(1);
  };

  useEffect(() => {
    const load = async () => {
      const r = await endpoints.leaderboard.board(board, page);
      if (r?.success && r.data) {
        setRows(r.data.rows);
        setMe(r.data.me);
        setTotalPages(r.data.pagination.totalPages);
        setTotal(r.data.pagination.total);
      }
    };
    load();
    const off = on("leaderboard:update", () => load());
    return off;
  }, [board, page, on]);

  const rankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4 animate-fade-in-down">
        🏆 Leaderboard
      </h1>
      <div className="mb-4 inline-flex gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
        {(["global", "weekly", "monthly"] as Board[]).map((b) => (
          <button
            key={b}
            onClick={() => switchBoard(b)}
            className={`rounded-lg px-4 py-2 text-sm capitalize transition-all ${
              board === b
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {me && (
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600/20 to-fuchsia-600/10 border border-indigo-500/40 rounded-xl p-4 mb-4 text-sm animate-fade-in-up">
          <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          Your position:{" "}
          <b className="text-indigo-300 text-base">#{me.rank}</b> ·{" "}
          <span className="text-amber-400 font-medium">{me.score} XP</span>
        </div>
      )}

      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-slate-400 uppercase text-xs tracking-wide">
            <tr>
              <th className="p-3 text-left w-16 font-medium">#</th>
              <th className="p-3 text-left font-medium">Player</th>
              <th className="p-3 text-right font-medium">XP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.userId}
                style={{ animationDelay: `${i * 35}ms` }}
                className={`border-t border-slate-800 transition-colors animate-fade-in ${
                  r.rank <= 3
                    ? "bg-amber-500/[0.04] hover:bg-amber-500/10"
                    : "hover:bg-slate-800/40"
                }`}
              >
                <td className="p-3 font-bold">
                  <span className="inline-flex items-center gap-1.5">
                    {rankBadge(r.rank) ?? (
                      <span className="text-slate-400">{r.rank}</span>
                    )}
                  </span>
                </td>
                <td className="p-3 font-medium">{r.name ?? "Player"}</td>
                <td className="p-3 text-right text-emerald-400 font-semibold">
                  {r.score}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-slate-500">
                  No rankings yet.
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

export default Leaderboard;
