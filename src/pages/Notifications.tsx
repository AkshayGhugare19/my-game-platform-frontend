import { useCallback, useEffect, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import Pagination from "@/components/Pagination";
import { useSocket } from "@/context/SocketContext";
import type { NotificationItem } from "@/types";

const Notifications: FC = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const { on } = useSocket();

  const load = useCallback(async () => {
    const r = await endpoints.notifications.list(page);
    if (r?.success && r.data) {
      setItems(r.data.data);
      setTotalPages(r.data.pagination.totalPages);
      setTotal(r.data.pagination.total);
    }
  }, [page]);

  useEffect(() => {
    load();
    const off = on("notification:new", () => load());
    return off;
  }, [load, on]);

  const markAll = async () => {
    await endpoints.notifications.markAllRead();
    load();
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button
          onClick={markAll}
          className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded"
        >
          Mark all read
        </button>
      </div>
      <div className="space-y-2">
        {items.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-xl border ${
              n.read_at
                ? "border-slate-800 bg-slate-900"
                : "border-indigo-700 bg-indigo-500/10"
            }`}
          >
            <div className="flex justify-between">
              <span className="font-semibold">{n.title}</span>
              <span className="text-xs text-slate-500">
                {new Date(n.created_at).toLocaleString()}
              </span>
            </div>
            {n.body && (
              <p className="text-sm text-slate-400 mt-1">{n.body}</p>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-slate-500">No notifications.</p>
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

export default Notifications;
