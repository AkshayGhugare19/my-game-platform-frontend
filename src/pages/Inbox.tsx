import { useCallback, useEffect, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import Pagination from "@/components/Pagination";
import type { InboxItem } from "@/types";

/**
 * On-site INBOX — the messages GAMRU campaigns delivered to this player.
 * Opening a message marks it read (an OPEN engagement event flows back to
 * GAMRU's campaign analytics); the CTA records a CLICK.
 */
const Inbox: FC = () => {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const r = await endpoints.inbox.list(page);
    if (r?.success && r.data) {
      setItems(r.data.items);
      setUnread(r.data.unread_count);
      setTotalPages(r.data.pagination.totalPages);
      setTotal(r.data.pagination.total);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const openMessage = async (item: InboxItem) => {
    const next = openId === item.id ? null : item.id;
    setOpenId(next);
    if (next && !item.read) {
      await endpoints.inbox.read(item.id);
      setItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, read: true } : m))
      );
      setUnread((u) => Math.max(0, u - 1));
    }
  };

  const onCta = async (item: InboxItem) => {
    await endpoints.inbox.click(item.id);
  };

  const unsubscribe = async () => {
    await endpoints.inbox.unsubscribe("ON_SITE");
    load();
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Inbox
          {unread > 0 && (
            <span className="ml-2 text-xs align-middle bg-indigo-600 px-2 py-0.5 rounded-full">
              {unread} new
            </span>
          )}
        </h1>
        <button
          onClick={unsubscribe}
          className="text-xs text-slate-400 hover:text-slate-200 underline"
        >
          Unsubscribe from on-site messages
        </button>
      </div>

      <div className="space-y-2">
        {items.map((m) => (
          <div
            key={m.id}
            className={`rounded-xl border ${
              m.read
                ? "border-slate-800 bg-slate-900"
                : "border-indigo-700 bg-indigo-500/10"
            }`}
          >
            <button
              onClick={() => openMessage(m)}
              className="w-full text-left p-4"
            >
              <div className="flex justify-between items-center gap-3">
                <span className="font-semibold flex items-center gap-2">
                  {!m.read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                  )}
                  {m.title}
                </span>
                <span className="text-xs text-slate-500 shrink-0">
                  {new Date(m.event_at).toLocaleString()}
                </span>
              </div>
              {m.event_label && (
                <span className="text-[11px] text-slate-500">
                  {m.event_label}
                </span>
              )}
            </button>
            {openId === m.id && (
              <div className="px-4 pb-4 -mt-1">
                <div
                  className="text-sm text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: m.body }}
                />
                <button
                  onClick={() => onCta(m)}
                  className="mt-3 text-xs bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded"
                >
                  Take me there
                </button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-slate-500">Your inbox is empty.</p>
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

export default Inbox;
