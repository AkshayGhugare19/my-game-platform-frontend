import { useEffect, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import apiService from "@/services/api";
import { useSocket } from "@/context/SocketContext";
import type { LeaderboardRow } from "@/types";

type Board = "global" | "weekly" | "monthly";

const Leaderboard: FC = () => {
  const [board, setBoard] = useState<Board>("global");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [me, setMe] = useState<LeaderboardRow | null>(null);
  const { on } = useSocket();

  const load = async (b: Board) => {
    const r = await apiService.get<{
      rows: LeaderboardRow[];
      me: LeaderboardRow | null;
    }>(`/leaderboard/${b}`, { limit: 20 });
    if (r?.success && r.data) {
      setRows(r.data.rows);
      setMe(r.data.me);
    }
  };

  useEffect(() => {
    load(board);
    const off = on("leaderboard:update", () => load(board));
    return off;
  }, [board, on]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      <div className="flex gap-2 mb-4">
        {(["global", "weekly", "monthly"] as Board[]).map((b) => (
          <button
            key={b}
            onClick={() => setBoard(b)}
            className={`px-4 py-2 rounded text-sm capitalize ${
              board === b
                ? "bg-indigo-600"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {me && (
        <div className="bg-indigo-600/20 border border-indigo-500 rounded-lg p-3 mb-4 text-sm">
          Your position: <b>#{me.rank}</b> · {me.score} XP
        </div>
      )}

      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="p-3 text-left w-16">#</th>
              <th className="p-3 text-left">Player</th>
              <th className="p-3 text-right">XP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-t border-slate-800">
                <td className="p-3 font-bold">{r.rank}</td>
                <td className="p-3">{r.name ?? "Player"}</td>
                <td className="p-3 text-right">{r.score}</td>
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
    </DashboardLayout>
  );
};

export default Leaderboard;
