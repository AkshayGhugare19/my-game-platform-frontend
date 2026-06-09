import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Layers, Package } from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import { MissionCard, MissionDetails } from "@/components/missions/MissionUi";
import type { ApiError, Mission, MissionBundle } from "@/types";

const bundlePct = (b: MissionBundle) =>
  b.total > 0 ? Math.min(100, Math.round((b.completed / b.total) * 100)) : 0;

const Chip: FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded-full bg-slate-700/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
    {children}
  </span>
);

const BundleSection: FC<{
  bundle: MissionBundle;
  onOpenMission: (id: string) => void;
}> = ({ bundle, onOpenMission }) => (
  <section className="mb-6 rounded-3xl bg-slate-900/60 p-5 ring-1 ring-white/10">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600/40 to-fuchsia-600/20 ring-1 ring-white/10">
          <Package size={22} className="text-violet-200" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold text-white">
              {bundle.name}
            </h3>
            {bundle.bundle_type && <Chip>{bundle.bundle_type}</Chip>}
            {bundle.periodicity && <Chip>{bundle.periodicity}</Chip>}
          </div>
          {bundle.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
              {bundle.description}
            </p>
          )}
        </div>
      </div>

      <div className="w-44 shrink-0">
        <div className="mb-1 flex justify-between text-[11px] text-slate-400">
          <span>Completed</span>
          <span>
            {bundle.completed}/{bundle.total}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700"
            style={{ width: `${bundlePct(bundle)}%` }}
          />
        </div>
      </div>
    </div>

    {bundle.missions.length === 0 ? (
      <p className="rounded-xl bg-slate-800/50 px-4 py-3 text-sm text-slate-500">
        This bundle has no available missions right now.
      </p>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {bundle.missions.map((m) => (
          <MissionCard key={m.id} m={m} onOpen={() => onOpenMission(m.id)} />
        ))}
      </div>
    )}
  </section>
);

const MissionBundles: FC = () => {
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<MissionBundle[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await endpoints.missionBundles.list();
    if (r?.success && r.data) setBundles(r.data.bundles);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The opened mission may live in any bundle — flatten to find it.
  const open: Mission | null = useMemo(() => {
    if (!openId) return null;
    for (const b of bundles) {
      const m = b.missions.find((x) => x.id === openId);
      if (m) return m;
    }
    return null;
  }, [bundles, openId]);

  const act = async (
    fn: () => Promise<{ success: boolean; message: string }>,
    ok: string
  ) => {
    setBusy(true);
    try {
      const r = await fn();
      if (r?.success) {
        toast.success(ok);
        await load();
      } else toast.error(r?.message || "Action failed");
    } catch (e) {
      toast.error((e as ApiError)?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center gap-3">
        <Layers size={26} className="text-violet-300" />
        <div>
          <h1 className="text-2xl font-extrabold text-white">Mission Bundles</h1>
          <p className="text-sm text-slate-400">
            Curated groups of missions — complete them to collect every reward.
          </p>
        </div>
      </div>

      {bundles.map((b) => (
        <BundleSection
          key={b.id}
          bundle={b}
          onOpenMission={(id) => setOpenId(id)}
        />
      ))}

      {!loading && bundles.length === 0 && (
        <p className="mt-10 text-center text-slate-500">
          No mission bundles available right now. Check back soon!
        </p>
      )}

      {open && (
        <MissionDetails
          m={open}
          busy={busy}
          onClose={() => setOpenId(null)}
          onJoin={() =>
            act(() => endpoints.missions.join(open.id), "Mission joined!")
          }
          onClaim={() =>
            act(
              () => endpoints.missions.claim(open.id),
              "Reward credited to your Bonuses!"
            )
          }
          onCancel={() =>
            act(() => endpoints.missions.cancel(open.id), "Mission cancelled")
          }
          onPlay={(key) => navigate(`/games/${key}?mission=${open.id}`)}
        />
      )}
    </DashboardLayout>
  );
};

export default MissionBundles;
