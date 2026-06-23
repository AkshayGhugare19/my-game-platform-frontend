import { useCallback, useEffect, useState, type FC, type FormEvent } from "react";
import { toast } from "react-toastify";
import { Copy, Plus, Pencil, Trash2 } from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import Pagination from "@/components/Pagination";
import type { Bonus } from "@/types";

const card = "rounded-xl border border-slate-800 bg-slate-900 p-5";
const input =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500";

type Draft = {
  bonusName: string;
  bonusType: string;
  amount: string;
  amountType: "RM" | "BM";
  status: "ACTIVE" | "INACTIVE";
  description: string;
};

const EMPTY: Draft = {
  bonusName: "",
  bonusType: "BONUS_CASH",
  amount: "",
  amountType: "RM",
  status: "ACTIVE",
  description: "",
};

const AdminBonuses: FC = () => {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await endpoints.bonuses.list(page);
    if (r?.success && r.data) {
      setBonuses(r.data.data);
      setTotalPages(r.data.pagination.totalPages);
      setTotal(r.data.pagination.total);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setDraft(EMPTY);
    setEditingId(null);
  };

  const startEdit = (b: Bonus) => {
    setEditingId(b.id);
    setDraft({
      bonusName: b.bonusName,
      bonusType: b.bonusType,
      amount: String(b.amount),
      amountType: b.amountType,
      status: b.status,
      description: b.description ?? "",
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(draft.amount);
    if (!draft.bonusName.trim()) return toast.error("Bonus name is required");
    if (!Number.isFinite(amount) || amount <= 0)
      return toast.error("Amount must be greater than 0");

    setSaving(true);
    try {
      const payload = {
        bonusName: draft.bonusName.trim(),
        bonusType: draft.bonusType.trim() || "BONUS_CASH",
        amount,
        amountType: draft.amountType,
        status: draft.status,
        description: draft.description,
      };
      const r = editingId
        ? await endpoints.bonuses.update(editingId, payload)
        : await endpoints.bonuses.create(payload);
      if (r?.success) {
        toast.success(editingId ? "Bonus updated" : "Bonus created");
        resetForm();
        await load();
      } else {
        toast.error(r?.message || "Failed to save bonus");
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Failed to save bonus");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this bonus? Existing grants are unaffected.")) return;
    const r = await endpoints.bonuses.remove(id);
    if (r?.success) {
      toast.success("Bonus deleted");
      if (editingId === id) resetForm();
      await load();
    } else {
      toast.error(r?.message || "Failed to delete bonus");
    }
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Bonus ID copied — paste it into a GAMRU rank/level");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">💸 Bonus Management</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form */}
        <form className={`${card} lg:col-span-1 h-fit`} onSubmit={handleSubmit}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {editingId ? <Pencil size={18} /> : <Plus size={18} />}
            {editingId ? "Edit bonus" : "New bonus"}
          </h2>

          <label className="block text-sm text-slate-400 mb-1">Bonus name</label>
          <input
            className={input}
            value={draft.bonusName}
            onChange={(e) => setDraft({ ...draft, bonusName: e.target.value })}
            placeholder="Welcome Bonus"
          />

          <label className="block text-sm text-slate-400 mb-1 mt-3">Bonus type</label>
          <input
            className={input}
            value={draft.bonusType}
            onChange={(e) => setDraft({ ...draft, bonusType: e.target.value })}
            placeholder="BONUS_CASH"
          />

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Amount</label>
              <input
                className={input}
                type="number"
                min="0"
                step="0.01"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Amount type</label>
              <select
                className={input}
                value={draft.amountType}
                onChange={(e) =>
                  setDraft({ ...draft, amountType: e.target.value as "RM" | "BM" })
                }
              >
                <option value="RM">RM (Real Money)</option>
                <option value="BM">BM (Bonus Money)</option>
              </select>
            </div>
          </div>

          <label className="block text-sm text-slate-400 mb-1 mt-3">Status</label>
          <select
            className={input}
            value={draft.status}
            onChange={(e) =>
              setDraft({ ...draft, status: e.target.value as "ACTIVE" | "INACTIVE" })
            }
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <label className="block text-sm text-slate-400 mb-1 mt-3">Description</label>
          <textarea
            className={input}
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="Optional notes"
          />

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-xs tracking-wide">
                <tr>
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Type</th>
                  <th className="p-3 text-right font-medium">Amount</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Bonus ID</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bonuses.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-slate-800 hover:bg-slate-800/40"
                  >
                    <td className="p-3">{b.bonusName}</td>
                    <td className="p-3 text-slate-400">{b.bonusType}</td>
                    <td className="p-3 text-right">
                      {b.amount}{" "}
                      <span className="text-xs text-slate-500">{b.amountType}</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={
                          b.status === "ACTIVE"
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => copyId(b.id)}
                        title="Copy bonus ID"
                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-400"
                      >
                        <Copy size={13} />
                        {b.id.slice(0, 8)}…
                      </button>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => startEdit(b)}
                          title="Edit"
                          className="text-slate-400 hover:text-indigo-400"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          title="Delete"
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {bonuses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500">
                      No bonuses yet — create one and paste its ID into a GAMRU
                      rank/level.
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminBonuses;
