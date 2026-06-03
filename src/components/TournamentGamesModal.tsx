import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import { X, Play } from "lucide-react";
import { gameMeta } from "@/config/gamesCatalog";

interface Props {
  tournamentId: string;
  tournamentName: string;
  games: string[];
  onClose: () => void;
}

/**
 * Lets the player pick which of a tournament's games to play. Launching a
 * game carries the `?tournament=` context so the play's points feed the
 * tournament leaderboard.
 */
const TournamentGamesModal: FC<Props> = ({
  tournamentId,
  tournamentName,
  games,
  onClose,
}) => {
  const navigate = useNavigate();

  const play = (key: string) => {
    onClose();
    navigate(`/games/${key}?tournament=${tournamentId}`);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="font-semibold text-slate-100">Choose a game</h2>
            <p className="text-xs text-slate-500">{tournamentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-2">
          {games.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              No games configured for this tournament.
            </p>
          ) : (
            games.map((key) => {
              const g = gameMeta(key);
              const Icon = g.icon;
              return (
                <button
                  key={key}
                  onClick={() => play(key)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors text-left group"
                >
                  <span
                    className={`grid place-items-center h-11 w-11 rounded-lg bg-gradient-to-br ${g.accent} text-white shrink-0`}
                  >
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-100 truncate">
                      {g.title}
                    </span>
                    <span className="block text-xs text-slate-400 truncate">
                      {g.blurb}
                    </span>
                  </span>
                  <span className="grid place-items-center h-8 w-8 rounded-lg bg-violet-600 text-white shrink-0 group-hover:bg-violet-500">
                    <Play size={14} />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TournamentGamesModal;
