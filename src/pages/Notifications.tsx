import { useCallback, useEffect, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import apiService from "@/services/api";
import { useSocket } from "@/context/SocketContext";
import type { NotificationItem, PaginatedData } from "@/types";

const Notifications: FC = () => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const { on } = useSocket();

  const load = useCallback(async () => {
    const r = await apiService.get<PaginatedData<NotificationItem>>(
      "/notifications",
      { page: 1, limit: 50 }
    );
    if (r?.success && r.data) setItems(r.data.data);
  }, []);

  useEffect(() => {
    load();
    const off = on("notification:new", () => load());
    return off;
  }, [load, on]);

  const markAll = async () => {
    await apiService.patch("/notifications/read-all");
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
    </DashboardLayout>
  );
};

export default Notifications;
