import { useCallback, useEffect, useState, type FC } from "react";
import { toast } from "react-toastify";
import {
  Calendar,
  Gamepad2,
  History,
  Medal,
  Star,
  Trophy,
  User,
} from "lucide-react";
import endpoints from "@/services/endpoints";
import { gameMeta } from "@/config/gamesCatalog";
import type { ApiError, TournamentHistoryEntry } from "@/types";

const INDUSTRY_COLOR = (industry: string) =>
  /sport/i.test(industry) ? "#417505" : "#9013fe";

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const RANK_RING = [
  "bg-amber-400 text-slate-900",
  "bg-slate-300 text-slate-900",
  "bg-orange-400 text-slate-900",
];

const HistoryRow: FC<{ h: TournamentHistoryEntry }> = ({ h }) => {
  const accent = INDUSTRY_COLOR(h.industry);
  return (
    <div className="flex items-center gap-3 sm:gap-4 rounded-2xl bg-slate-900 ring-1 ring-white/10 p-3 hover:ring-violet-500/30 transition-colors">
      {/* thumbnail */}
      <div
        className="relative shrink-0 rounded-xl overflow-hidden h-14 w-20 sm:w-24 bg-slate-800"
        style={
          h.image
            ? undefined
            : { backgroundImage: `linear-gradient(135deg, ${accent}cc, #0f172a)` }
        }
      >
        {h.image ? (
          <img
            src={h.image}
            alt={h.name}
            onError={(e) => (e.currentTarget.style.display = "none")}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <Trophy size={20} className="text-white/40" />
          </div>
        )}
      </div>

      {/* name + meta + games played */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100 truncate">{h.name}</span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: accent }}
          >
            {h.industry}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-0.5">
          <span className="inline-flex items-center gap-1.5">
            <User size={12} /> {h.player_name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={12} /> Last played {fmtDate(h.last_played_at)}
          </span>
        </div>
        {h.games_played.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {h.games_played.map((g) => {
              const m = gameMeta(g.game);
              const GIcon = m.icon;
              return (
                <span
                  key={g.game}
                  className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-lg bg-slate-800 ring-1 ring-white/5 text-[11px] text-slate-200"
                >
                  <span
                    className={`grid place-items-center h-5 w-5 rounded-md bg-gradient-to-br ${m.accent} text-white`}
                  >
                    <GIcon size={11} />
                  </span>
                  {m.title}
                  {g.plays > 1 && (
                    <span className="text-slate-400 font-semibold">×{g.plays}</span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* stats */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="text-center px-2">
          <div className="flex items-center gap-1 text-slate-100 font-bold text-sm">
            <Gamepad2 size={14} className="text-violet-300" /> {h.plays}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Games
          </div>
        </div>
        <div className="text-center px-2">
          <div className="flex items-center gap-1 text-emerald-300 font-bold text-sm">
            <Star size={14} /> {h.xp.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            XP
          </div>
        </div>
        <div
          className={`grid place-items-center h-10 w-10 rounded-xl text-sm font-extrabold ${
            RANK_RING[h.rank - 1] ?? "bg-slate-800 text-slate-200"
          }`}
          title={`Rank #${h.rank}`}
        >
          {h.rank <= 3 ? <Medal size={18} /> : `#${h.rank}`}
        </div>
      </div>
    </div>
  );
};

interface Props {
  /** Switches the parent back to the tournaments tab (empty-state CTA). */
  onBrowse: () => void;
}

/**
 * The "History" tab of the Tournaments page: lazily loads the player's
 * tournament history and renders loading, empty, and populated states.
 */
const TournamentHistory: FC<Props> = ({ onBrowse }) => {
  const [history, setHistory] = useState<TournamentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await endpoints.tournaments.history();
      if (r?.success && r.data) setHistory(r.data);
    } catch (e) {
      toast.error((e as ApiError)?.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-slate-900 ring-1 ring-white/10 animate-pulse"
            style={{ height: "5rem" }}
          />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 rounded-3xl bg-slate-900/60 ring-1 ring-white/10">
        <div className="grid place-items-center h-16 w-16 rounded-2xl bg-violet-500/10 mb-4">
          <History size={30} className="text-violet-300" />
        </div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">
          No history yet
        </h2>
        <p className="text-slate-400 max-w-sm mb-5">
          Play a tournament game and your results — games played, XP earned, and
          rank — will show up here.
        </p>
        <button
          onClick={onBrowse}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-fuchsia-500 transition-all"
        >
          Browse tournaments
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((h) => (
        <HistoryRow key={h.tournament_id} h={h} />
      ))}
    </div>
  );
};

export default TournamentHistory;
