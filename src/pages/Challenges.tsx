import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import {
  ChallengeCard,
  ChallengeDetails,
} from "@/components/challenges/ChallengeUi";
import type { ApiError, Challenge } from "@/types";

const Hero: FC = () => (
  <div className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
    <img
      src="https://t4.ftcdn.net/jpg/16/87/35/37/240_F_1687353797_OEyUK36TToKTnEkBI76RoDVm9I8CsF9p.jpg"
      alt="Challenges"
      className="absolute inset-0 h-full w-full object-cover scale-105 animate-[pulse_8s_ease-in-out_infinite]"
    />

    <div className="absolute inset-0 bg-black/10" />

    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 to-transparent" />

    <div className="relative z-10 flex min-h-[220px] items-center px-8 py-8 md:min-h-[260px]">
      <div className="max-w-xl">
        <h1 className="animate-fade-in text-3xl font-extrabold leading-tight text-white md:text-5xl">
          TAKE ON CHALLENGES
          <br />
          <span className="text-rose-400">WIN REWARDS</span>
        </h1>

        <p className="mt-4 text-sm text-slate-300 md:text-base">
          Hit the target condition before time runs out to unlock the reward.
        </p>
      </div>
    </div>
  </div>
);

const Challenges: FC = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [category, setCategory] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await endpoints.challenges?.list();
      if (r?.success && Array.isArray(r?.data)) {
        setChallenges(r.data);
      }
    } catch (e) {
      toast.error((e as ApiError)?.message || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(challenges?.map((c) => c?.category)))],
    [challenges]
  );

  const visible = useMemo(
    () =>
      category === "All"
        ? challenges
        : challenges?.filter((c) => c?.category === category),
    [challenges, category]
  );

  const open = challenges?.find((c) => c?.id === openId) ?? null;

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
      <Hero />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Challenges</h2>
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
        {visible?.map((c) => (
          <ChallengeCard key={c?.id} c={c} onOpen={() => setOpenId(c?.id)} />
        ))}
      </div>

      {!loading && visible?.length === 0 && (
        <p className="mt-10 text-center text-slate-500">
          No challenges available right now. Check back soon!
        </p>
      )}

      {open && (
        <ChallengeDetails
          c={open}
          busy={busy}
          onClose={() => setOpenId(null)}
          onJoin={() =>
            act(
              () => endpoints.challenges?.join(open.id),
              "Challenge joined!"
            )
          }
          onClaim={() =>
            act(
              () => endpoints.challenges?.claim(open.id),
              "Reward credited to your Bonuses!"
            )
          }
          onCancel={() =>
            act(
              () => endpoints.challenges?.cancel(open.id),
              "Challenge cancelled"
            )
          }
          onPlay={(key) => navigate(`/games/${key}?challenge=${open.id}`)}
        />
      )}
    </DashboardLayout>
  );
};

export default Challenges;
