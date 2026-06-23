import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import { MissionCard, MissionDetails } from "@/components/missions/MissionUi";
import type { ApiError, Mission, MissionBranding } from "@/types";

const Hero: FC<{ branding: MissionBranding }> = ({ branding }) => (
  <div className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
    {branding.banner_desktop ?
    <img
      src="https://t4.ftcdn.net/jpg/16/87/35/37/240_F_1687353797_OEyUK36TToKTnEkBI76RoDVm9I8CsF9p.jpg"
      alt="Missions"
      className="absolute inset-0 h-full w-full object-cover scale-105 animate-[pulse_8s_ease-in-out_infinite]"
    /> :
    <img
      src="https://t4.ftcdn.net/jpg/16/87/35/37/240_F_1687353797_OEyUK36TToKTnEkBI76RoDVm9I8CsF9p.jpg"
      alt="Missions"
      className="absolute inset-0 h-full w-full object-cover scale-105 animate-[pulse_8s_ease-in-out_infinite]"
    />
    }

    <div className="absolute inset-0 bg-black/10" />

    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 to-transparent" />

    <div className="relative z-10 flex min-h-[220px] items-center px-8 py-8 md:min-h-[260px]">
      <div className="max-w-xl">
        <h1 className="animate-fade-in text-3xl font-extrabold leading-tight text-white md:text-5xl">
          COMPLETE MISSIONS
          <br />
          <span className="text-rose-400">GET REWARDS</span>
        </h1>

        <p className="mt-4 text-sm text-slate-300 md:text-base">
          Finish missions and unlock bonuses as you play.
        </p>
      </div>
    </div>
  </div>
);

const Missions: FC = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [branding, setBranding] = useState<MissionBranding>({
    banner_desktop: null,
    banner_mobile: null,
  });
  const [category, setCategory] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await endpoints.missions.list();
    if (r?.success && r.data) {
      setMissions(r.data.missions);
      setBranding(r.data.branding);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(missions.map((m) => m.category)))],
    [missions]
  );

  const visible = useMemo(
    () =>
      category === "All"
        ? missions
        : missions.filter((m) => m.category === category),
    [missions, category]
  );

  const open = missions.find((m) => m.id === openId) ?? null;

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
      <Hero branding={branding} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Missions</h2>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-200 ring-1 ring-white/10 focus:outline-none"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "Category" : c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((m) => (
          <MissionCard key={m.id} m={m} onOpen={() => setOpenId(m.id)} />
        ))}
      </div>

      {!loading && visible.length === 0 && (
        <p className="mt-10 text-center text-slate-500">
          No missions available right now. Check back soon!
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

export default Missions;
