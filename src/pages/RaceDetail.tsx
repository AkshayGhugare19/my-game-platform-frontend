import { useCallback, useEffect, useState, type FC } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ChevronLeft,
  Coins,
  Crown,
  Flag,
  Gamepad2,
  Play,
  Shield,
  Trophy,
  UserPlus,
} from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import RaceGamesModal from "@/components/RaceGamesModal";
import Countdown from "@/components/Countdown";
import { gameMeta } from "@/config/gamesCatalog";
import type {
  ApiError,
  Race,
  RaceBranding,
  RaceLeaderboardEntry,
  RaceState,
} from "@/types";

const STATE_META: Record<
  RaceState,
  { label: string; dot: string; pill: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    dot: "bg-amber-400",
    pill: "text-amber-300 bg-amber-500/15 ring-amber-500/30",
  },
  IN_PROGRESS: {
    label: "In Progress",
    dot: "bg-emerald-400 animate-pulse",
    pill: "text-emerald-300 bg-emerald-500/15 ring-emerald-500/30",
  },
  ENDED: {
    label: "Ended",
    dot: "bg-rose-400",
    pill: "text-rose-300 bg-rose-500/15 ring-rose-500/30",
  },
};

const isSport = (industry: string) => /sport/i.test(industry);

const TERMS = [
  ["Eligibility", "Participants must be at least 21 years old and provide valid identification."],
  ["Format", "The race runs for a predetermined duration. Players compete using the configured games and bet limits."],
  ["Scoring", "Scores are based on points won during play. In a tie, the earliest qualifying score ranks higher."],
  ["Conduct", "Players must adhere to the platform's code of conduct. Cheating or disruptive behavior results in disqualification."],
];

const StatChip: FC<{ icon: React.ReactNode; value: string; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/70 ring-1 ring-white/5 whitespace-nowrap">
    <span className="text-violet-300 shrink-0">{icon}</span>
    <div className="flex items-center gap-1">
      <div className="text-sm font-bold text-slate-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  </div>
);

const RANK_RING = [
  "bg-amber-400 text-slate-900", // 1
  "bg-slate-300 text-slate-900", // 2
  "bg-orange-400 text-slate-900", // 3
];

const LeaderboardList: FC<{ board: RaceLeaderboardEntry[] }> = ({ board }) => {
  if (board.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="grid place-items-center h-14 w-14 rounded-2xl bg-violet-500/10 mx-auto mb-3">
          <Trophy size={26} className="text-violet-300" />
        </div>
        <p className="text-sm text-slate-400">
          No scores yet. Play a game to get on the board!
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {board.map((e) => {
        const top = e.rank <= 3;
        return (
          <li
            key={e.email}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 ring-1 transition-colors ${
              e.is_me
                ? "bg-violet-500/15 ring-violet-500/40"
                : "bg-slate-800/50 ring-white/5"
            }`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <span
                className={`grid place-items-center h-8 w-8 rounded-full text-xs font-extrabold shrink-0 ${
                  RANK_RING[e.rank - 1] ?? "bg-slate-700 text-slate-300"
                }`}
              >
                {top ? <Crown size={15} /> : e.rank}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-100 truncate">
                  {e.name}
                  {e.is_me && (
                    <span className="ml-2 text-[10px] text-violet-300 font-bold uppercase">
                      You
                    </span>
                  )}
                </span>
                <span className="block text-[11px] text-slate-400">
                  Rank #{e.rank}
                </span>
              </span>
            </span>
            <span className="flex flex-col items-end">
              <span className="text-sm font-extrabold text-white">
                {e.score.toLocaleString()}
              </span>
              {e.prize ? (
                <span className="text-[11px] font-bold text-emerald-400">
                  +${e.prize.toLocaleString()}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * Races has no gamru-side branding merge — accent colors are a static local
 * default, same role Tournaments' hardcoded gradient plays.
 */
const DEFAULT_RACE_BRANDING: RaceBranding = {
  banner_desktop: null,
  banner_mobile: null,
  tag_color_casino: "#7c3aed",
  tag_color_sport: "#059669",
};

const RaceDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const branding = DEFAULT_RACE_BRANDING;
  const [r, setR] = useState<Race | null>(null);
  const [board, setBoard] = useState<RaceLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgBroken, setImgBroken] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await endpoints.races.get(id);
      if (res?.success && res.data) {
        setR(res.data.race);
        setBoard(res.data.leaderboard);
      } else toast.error(res?.message || "Failed to load race");
    } catch (e) {
      toast.error((e as ApiError)?.message || "Failed to load race");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const joinRace = useCallback(async () => {
    if (!id) return;
    setJoining(true);
    try {
      const res = await endpoints.races.join(id);
      if (res?.success) {
        toast.success("Race joined!");
        load();
      } else toast.error(res?.message || "Failed to join race");
    } catch (e) {
      toast.error((e as ApiError)?.message || "Failed to join race");
    } finally {
      setJoining(false);
    }
  }, [id, load]);

  const claimPrize = useCallback(async () => {
    if (!id) return;
    setClaiming(true);
    try {
      const res = await endpoints.races.claim(id);
      if (res?.success) {
        toast.success(`Prize claimed: $${res.data?.prize ?? ""}`.trim());
        setClaimed(true);
        load();
      } else toast.error(res?.message || "Failed to claim prize");
    } catch (e) {
      toast.error((e as ApiError)?.message || "Failed to claim prize");
    } finally {
      setClaiming(false);
    }
  }, [id, load]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <DashboardLayout>
        <div
          className="rounded-3xl bg-slate-900 ring-1 ring-white/10 animate-pulse"
          style={{ height: "16rem" }}
        />
      </DashboardLayout>
    );
  }
  if (!r) {
    return (
      <DashboardLayout>
        <p className="text-slate-400">Race not found.</p>
      </DashboardLayout>
    );
  }

  const meta = STATE_META[r.state];
  const accent = isSport(r.category)
    ? branding.tag_color_sport
    : branding.tag_color_casino;
  const canJoin = !r.registered && r.state !== "ENDED";
  const canPlay = r.registered && r.games.length > 0 && r.state !== "ENDED";
  const HeroIcon = r.games.length ? gameMeta(r.games[0]).icon : Flag;
  const myEntry = board.find((e) => e.is_me);
  const myPrize = myEntry?.prize ?? 0;
  // "claimed" is server-authoritative (GAMRU → games via the leaderboard entry);
  // `claimed` local state only covers the optimistic gap until the reload lands.
  const alreadyClaimed = Boolean(myEntry?.claimed) || claimed;
  const canClaim = r.state === "ENDED" && myPrize > 0 && !alreadyClaimed;

  return (
    <DashboardLayout>
      <button
        onClick={() => navigate("/races")}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-3"
      >
        <ChevronLeft size={16} /> Back to races
      </button>

      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-xl shadow-black/40">
        <div
          className="relative"
          style={{ height: "clamp(12rem, 30vw, 16rem)" }}
        >
          {r.banner_image && !imgBroken ? (
            <img
              src={r.banner_image}
              alt={r.name}
              onError={() => setImgBroken(true)}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 grid place-items-center"
              style={{
                backgroundImage: `linear-gradient(135deg, ${accent}cc, #0f172a)`,
              }}
            >
              <HeroIcon size={64} className="text-white/35" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-white/5" />

          <div
            className="absolute flex items-center justify-between gap-2"
            style={{ top: 14, left: 14, right: 14 }}
          >
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 backdrop-blur ${meta.pill}`}
            >
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg whitespace-nowrap"
              style={{ backgroundColor: accent }}
            >
              {r.category}
            </span>
          </div>

          <div className="absolute" style={{ left: 24, right: 24, bottom: 20 }}>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-lg">
              {r.name}
            </h1>
            {r.start_date && (
              <p className="text-sm text-slate-300/90 mt-1">
                Starts {r.start_date}
              </p>
            )}
            <div className="mt-2">
              <Countdown end={r.end_date} />
            </div>
          </div>
        </div>

        {/* stat bar */}
<div className="py-2 border-t border-white/5 bg-slate-900">
        <div className="px-4 py-4 flex gap-2 flex-wrap items-center gap-x-3 gap-y-2.5 ">
          {r.min_bet != null && (
            <StatChip icon={<Coins size={15} />} value={`$${r.min_bet}`} label="Min Bet" />
          )}
          {r.eligible_players && (
            <StatChip icon={<Shield size={15} />} value={r.eligible_players} label="Eligibility" />
          )}
          <StatChip
            icon={<Gamepad2 size={15} />}
            value={String(r.games.length)}
            label={r.games.length === 1 ? "Game" : "Games"}
          />
          {canJoin && (
            <button
              onClick={joinRace}
              disabled={joining}
              className="ml-auto flex items-center justify-center h-10 px-5 rounded-xl text-sm font-bold gap-1.5 text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/40 disabled:opacity-50"
            >
              <UserPlus size={16} />
              {joining ? "Joining…" : "Join"}
            </button>
          )}
          {canPlay && (
            <button
              onClick={() => setPickerOpen(true)}
              className="ml-auto flex items-center justify-center h-10 px-5 rounded-xl text-sm font-bold gap-1.5 text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/40"
            >
              <Play size={16} fill="currentColor" /> Play
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="rounded-3xl bg-slate-900 ring-1 ring-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-bold text-slate-100">
              <Trophy size={18} className="text-amber-400" /> Leaderboard
            </h2>
            {board.length > 0 && (
              <span className="text-xs text-slate-400">
                {board.length} player{board.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <LeaderboardList board={board} />
        </div>

        {/* Info */}
        <div className="rounded-3xl bg-slate-900 ring-1 ring-white/10 p-5 space-y-4">
          {canJoin ? (
            <button
              onClick={joinRace}
              disabled={joining}
              className="w-full flex gap-1.5 justify-center items-center py-2 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50"
            >
              <UserPlus size={18} />
              {joining ? "Joining…" : "Join the race"}
            </button>
          ) : canPlay ? (
            <button
              onClick={() => setPickerOpen(true)}
              className="w-full flex gap-1 justify-center items-center py-2 rounded-md  bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
            >
              <Play size={18} fill="currentColor" /> Play &amp; climb the leaderboard
            </button>
          ) : (
            <div className="rounded-2xl bg-slate-800/60 ring-1 ring-white/5 px-4 py-3 text-sm text-slate-400 text-center">
              {r.state === "ENDED"
                ? "This race has ended."
                : "No games are configured for this race yet."}
            </div>
          )}

          {canClaim && (
            <button
              onClick={claimPrize}
              disabled={claiming}
              className="w-full flex gap-1.5 justify-center items-center py-2 rounded-md bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-900 font-semibold hover:from-amber-400 hover:to-yellow-400 disabled:opacity-60"
            >
              <Trophy size={18} />
              {claiming ? "Claiming…" : `Claim your $${myPrize.toLocaleString()} prize`}
            </button>
          )}
          {r.state === "ENDED" && myPrize > 0 && alreadyClaimed && (
            <div className="rounded-2xl bg-green-500/10 ring-1 ring-green-500/30 px-4 py-3 text-sm text-green-300 text-center">
              Prize claimed — it's in your rewards.
            </div>
          )}

          {r.description && (
            <p className="text-sm text-slate-300 leading-relaxed">
              {r.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {r.eligible_players && (
              <div className="rounded-xl bg-slate-800/50 ring-1 ring-white/5 px-3 py-2">
                <div className="text-[11px] text-slate-400">Eligibility</div>
                <div className="text-sm font-semibold text-slate-100">
                  {r.eligible_players}
                </div>
              </div>
            )}
            {r.prize_pool != null && (
              <div className="rounded-xl bg-slate-800/50 ring-1 ring-white/5 px-3 py-2">
                <div className="text-[11px] text-slate-400">Prize Pool</div>
                <div className="text-sm font-semibold text-slate-100">
                  ${r.prize_pool}
                </div>
              </div>
            )}
            {r.race_type && (
              <div className="rounded-xl bg-slate-800/50 ring-1 ring-white/5 px-3 py-2">
                <div className="text-[11px] text-slate-400">Type</div>
                <div className="text-sm font-semibold text-slate-100">
                  {r.race_type}
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-slate-100 border-b border-white/10 pb-2 mb-3">
              Terms &amp; Conditions
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-400">
              {TERMS.map(([title, body]) => (
                <li key={title}>
                  <span className="font-semibold text-slate-200">{title}:</span>{" "}
                  {body}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <RaceGamesModal
          raceId={r.id}
          raceName={r.name}
          games={r.games}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default RaceDetail;
