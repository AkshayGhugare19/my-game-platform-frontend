import { useCallback, useEffect, useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Clock,
  Coins,
  Gamepad2,
  History,
  Info,
  Play,
  RefreshCw,
  Shield,
  Trophy,
} from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import TournamentGamesModal from "@/components/TournamentGamesModal";
import TournamentHistory from "@/components/TournamentHistory";
import Countdown from "@/components/Countdown";
import { gameMeta } from "@/config/gamesCatalog";
import type {
  ApiError,
  Tournament,
  TournamentBranding,
  TournamentState,
} from "@/types";

const STATE_META: Record<
  TournamentState,
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
const accentFor = (t: Tournament, b: TournamentBranding) =>
  isSport(t.industry) ? b.tag_color_sport : b.tag_color_casino;

/** Hero image with a graceful gradient fallback when missing or broken. */
const Hero: FC<{ t: Tournament; accent: string }> = ({ t, accent }) => {
  const [broken, setBroken] = useState(false);
  const Icon = t.games.length ? gameMeta(t.games[0]).icon : Trophy;
  const showImg = t.large_image && !broken;
  return (
    <div
      className="relative overflow-hidden w-full"
      style={{ height: "clamp(11rem, 26vw, 15rem)" }}
    >
      {showImg ? (
        <img
          src={t.large_image as string}
          alt={t.name}
          onError={() => setBroken(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accent}cc, #0f172a)`,
          }}
        >
          <Icon size={56} className="text-white/35" />
        </div>
      )}
      {/* gloss + bottom gradient for legible overlay text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-white/5" />
    </div>
  );
};

const StatChip: FC<{ icon: React.ReactNode; value: string; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/70 ">
    <span className="text-violet-300 shrink-0">{icon}</span>
    <div className="flex items-center gap-1">
      <div className="text-sm font-bold text-slate-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  </div>
);

const TournamentCard: FC<{
  t: Tournament;
  branding: TournamentBranding;
  onOpen: () => void;
  onPlay: () => void;
}> = ({ t, branding, onOpen, onPlay }) => {
  const meta = STATE_META[t.state];
  const accent = accentFor(t, branding);
  const canPlay = t.games.length > 0 && t.state !== "ENDED";
  return (
    <div className="group rounded-3xl overflow-hidden bg-slate-900 ring-1 ring-white/10 shadow-xl shadow-black/40 transition-transform duration-300 hover:-translate-y-0.5 hover:ring-violet-500/30">
      <button onClick={onOpen} className="relative block w-full text-left">
        <Hero t={t} accent={accent} />
        <div
          className="absolute flex items-center justify-between gap-2"
          style={{ top: 14, left: 14, right: 14 }}
        >
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 backdrop-blur ${meta.pill}`} >
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
             {meta.label}
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg whitespace-nowrap"
            style={{ backgroundColor: accent }}
          >
            {t.industry}
          </span>
        </div>

        <div className="absolute" style={{ left: 18, right: 18, bottom: 16 }}>
          <h3 className="text-lg sm:text-2xl font-extrabold text-white drop-shadow-lg leading-tight">
            {t.name}
          </h3>
          {t.start_date && (
            <p className="text-xs text-slate-300/90 mt-1">
              Starts {t.start_date}
            </p>
          )}
          <div className="mt-2">
            <Countdown end={t.end_date} />
          </div>
        </div>
      </button>

      {/* Footer */}
      <div className="py-2 border-t border-white/5">
        <div className="px-4 py-4 flex gap-2 flex-wrap items-center gap-x-3 gap-y-2.5 ">
        {t.max_bets != null && (
          <StatChip icon={<RefreshCw size={15} />} value={String(t.max_bets)} label="Spins" />
        )}
        {t.min_bet != null && (
          <StatChip icon={<Coins size={15} />} value={`$${t.min_bet}`} label="Min Bet" />
        )}
        {t.eligibility_type && (
          <StatChip icon={<Shield size={15} />} value={t.eligibility_type} label="Eligibility" />
        )}
        {t.period && (
          <StatChip icon={<Clock size={15} />} value={t.period} label="Duration" />
        )}
        <StatChip
          icon={<Gamepad2 size={15} />}
          value={String(t.games.length)}
          label={t.games.length === 1 ? "Game" : "Games"}
        />

        <button
          onClick={canPlay ? onPlay : onOpen}
          disabled={t.state === "ENDED"}
          className="ml-auto flex items-center justify-center h-10 px-5 rounded-xl text-sm font-bold gap-1.5 text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/40"
        >
          <Play size={16} fill="currentColor" />
          {t.state === "ENDED" ? "Ended" : "Play"}
        </button>
      </div>
      </div>
    </div>
  );
};

type Tab = "tournaments" | "history";

const Tournaments: FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("tournaments");
  const [branding, setBranding] = useState<TournamentBranding | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState<Tournament | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await endpoints.tournaments.list();
      if (r?.success && r.data) {
        setBranding(r.data.branding);
        setTournaments(r.data.tournaments);
      }
    } catch (e) {
      toast.error((e as ApiError)?.message || "Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout>
      {/* Banner header with tabs */}
      <div
        className="relative rounded-3xl overflow-hidden mb-7 flex items-center justify-center ring-1 ring-white/10"
        style={{ height: "clamp(7rem, 16vw, 9rem)" }}
      >
        {branding?.banner_desktop ? (
          <img
            src={branding.banner_desktop}
            alt="Tournaments"
            onError={(e) => (e.currentTarget.style.display = "none")}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-violet-900 to-slate-900" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative text-center">
          <div className="inline-flex gap-1.5 bg-slate-950/60 backdrop-blur rounded-2xl p-1.5 ring-1 ring-white/10">
            <button
              onClick={() => setTab("tournaments")}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                tab === "tournaments"
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Trophy size={16} /> TOURNAMENTS
            </button>
            <button
              onClick={() => setTab("history")}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                tab === "history"
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <History size={16} /> HISTORY
            </button>
          </div>
        </div>
      </div>

      {tab === "history" ? (
        <TournamentHistory onBrowse={() => setTab("tournaments")} />
      ) : loading ? (
        <div className="space-y-5">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-3xl bg-slate-900 ring-1 ring-white/10 animate-pulse"
              style={{ height: "18rem" }}
            />
          ))}
        </div>
      ) : tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 rounded-3xl bg-slate-900/60 ring-1 ring-white/10">
          <div className="grid place-items-center h-16 w-16 rounded-2xl bg-violet-500/10 mb-4">
            <Info size={30} className="text-violet-300" />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-1">
            No Tournaments
          </h2>
          <p className="text-slate-400 max-w-sm mb-5">
            No tournaments available at the moment. Stay tuned for upcoming
            events and get ready to play and win big!
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
          >
            Go to Home
          </button>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {branding &&
            tournaments.map((t) => (
              <TournamentCard
                key={t.id}
                t={t}
                branding={branding}
                onOpen={() => navigate(`/tournaments/${t.id}`)}
                onPlay={() => setPicker(t)}
              />
            ))}
        </div>
      )}

      {picker && (
        <TournamentGamesModal
          tournamentId={picker.id}
          tournamentName={picker.name}
          games={picker.games}
          onClose={() => setPicker(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default Tournaments;
