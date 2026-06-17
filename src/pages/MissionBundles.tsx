import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Gift, Layers, Package } from "lucide-react";
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
  busy: boolean;
  onOpenMission: (id: string) => void;
  onClaim: () => void;
}> = ({ bundle, busy, onOpenMission, onClaim }) => {
  // The bundle is claimable only once every mission is done. Reward is granted
  // for all its missions at once; once each is claimed the bundle is settled.
  const allDone = bundle.total > 0 && bundle.completed === bundle.total;
  const pending = bundle.missions.filter((m) => m.status === "COMPLETED").length;
  const settled =
    bundle.missions.length > 0 &&
    bundle.missions.every((m) => m.status === "CLAIMED");

  return (
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

      <div className="w-52 shrink-0">
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

        {settled ? (
          <div className="mt-3 rounded-xl bg-indigo-500/10 py-2 text-center text-xs font-semibold text-indigo-300 ring-1 ring-indigo-500/20">
            Rewards claimed
          </div>
        ) : allDone && pending > 0 ? (
          <button
            disabled={busy}
            onClick={onClaim}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            <Gift size={14} />
            {busy ? "Claiming…" : "Claim Bundle Reward"}
          </button>
        ) : (
          <div className="mt-3 text-center text-[11px] text-slate-500">
            Complete all missions to claim
          </div>
        )}
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
};

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

  // The opened mission may live in any bundle — find it and its bundle.
  const { open, openBundle } = useMemo<{
    open: Mission | null;
    openBundle: MissionBundle | null;
  }>(() => {
    if (!openId) return { open: null, openBundle: null };
    for (const b of bundles) {
      const m = b.missions.find((x) => x.id === openId);
      if (m) return { open: m, openBundle: b };
    }
    return { open: null, openBundle: null };
  }, [bundles, openId]);

  // Claiming is done at the BUNDLE level (one button, all missions at once), so
  // a mission's own detail panel never offers an individual claim — it points
  // back to the bundle's Claim button instead.
  const claimLockedReason = openBundle
    ? openBundle.completed < openBundle.total
      ? `Complete all ${openBundle.total} missions in this bundle to claim`
      : 'Use “Claim Bundle Reward” to claim every mission at once'
    : null;

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

  // Claim every completed mission in the bundle in one go.
  const claimBundle = async (bundle: MissionBundle) => {
    const pending = bundle.missions.filter((m) => m.status === "COMPLETED");
    if (pending.length === 0) return;
    setBusy(true);
    try {
      let claimed = 0;
      for (const m of pending) {
        const r = await endpoints.missionBundles.claim(bundle.id, m.id);
        if (r?.success) claimed += 1;
        else toast.error(r?.message || `Couldn't claim “${m.name}”`);
      }
      if (claimed > 0)
        toast.success(
          `Claimed ${claimed} reward${claimed === 1 ? "" : "s"} — see your Bonuses!`
        );
      await load();
    } catch (e) {
      toast.error((e as ApiError)?.message || "Claim failed");
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
          busy={busy}
          onOpenMission={(id) => setOpenId(id)}
          onClaim={() => claimBundle(b)}
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
            openBundle &&
            act(
              () => endpoints.missionBundles.join(openBundle.id, open.id),
              "Mission joined!"
            )
          }
          onClaim={() =>
            openBundle &&
            act(
              () => endpoints.missionBundles.claim(openBundle.id, open.id),
              "Reward credited to your Bonuses!"
            )
          }
          onCancel={() =>
            openBundle &&
            act(
              () => endpoints.missionBundles.cancel(openBundle.id, open.id),
              "Mission cancelled"
            )
          }
          onPlay={(key) =>
            navigate(
              `/games/${key}?mission=${open.id}${
                openBundle ? `&bundle=${openBundle.id}` : ''
              }`
            )
          }
          claimLockedReason={claimLockedReason}
        />
      )}
    </DashboardLayout>
  );
};

export default MissionBundles;
