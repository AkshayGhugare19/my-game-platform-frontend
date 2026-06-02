import type { FC } from "react";
import { NavLink } from "react-router-dom";
import {
  Disc3,
  Flame,
  Brain,
  Zap,
  SlidersHorizontal,
  Worm,
  Spade,
  Plane,
} from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";

const GAMES = [
  {
    to: "/games/slider",
    title: "Slider Game",
    blurb: "Stop the marker past your bet line to win.",
    icon: SlidersHorizontal,
    accent: "from-sky-500 to-blue-500",
  },
  {
    to: "/games/lucky-spinner",
    title: "Lucky Spinner",
    blurb: "Pick a number, spin the wheel, win big.",
    icon: Disc3,
    accent: "from-indigo-500 to-purple-500",
  },
  {
    to: "/games/dragon-run",
    title: "Dragon Run",
    blurb: "Jump over walls. Grab gems. One hit ends it.",
    icon: Flame,
    accent: "from-rose-500 to-orange-500",
  },
  {
    to: "/games/memory-match",
    title: "Memory Match",
    blurb: "Flip cards, pair them up. Fewer moves = more XP.",
    icon: Brain,
    accent: "from-emerald-500 to-cyan-500",
  },
  {
    to: "/games/click-storm",
    title: "Click Storm",
    blurb: "15 seconds. Hit every target. Beat your record.",
    icon: Zap,
    accent: "from-amber-500 to-yellow-500",
  },
  {
    to: "/games/snake",
    title: "Snake",
    blurb: "Eat apples, grow longer. Don't bite your tail.",
    icon: Worm,
    accent: "from-green-500 to-emerald-500",
  },
  {
    to: "/games/teen-patti",
    title: "Teen Patti",
    blurb: "Three cards each. Beat the dealer's hand to win.",
    icon: Spade,
    accent: "from-fuchsia-500 to-purple-600",
  },
  {
    to: "/games/aviator",
    title: "Aviator",
    blurb: "Cash out before the plane flies away. Greed crashes.",
    icon: Plane,
    accent: "from-red-500 to-rose-600",
  },
];

const Games: FC = () => (
  <DashboardLayout>
    <h1 className="text-2xl font-bold mb-2 animate-fade-in-down">🎮 Games</h1>
    <p className="text-slate-400 text-sm mb-6 animate-fade-in-down">
      Quick-play mini games. Every round earns XP and feeds the rewards engine.
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {GAMES.map(({ to, title, blurb, icon: Icon, accent }, i) => (
        <NavLink
          key={to}
          to={to}
          style={{ animationDelay: `${i * 60}ms` }}
          className="card-interactive group relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-fade-in-up"
        >
          <div
            className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-2xl transition-opacity group-hover:opacity-30`}
          />
          <div
            className={`bg-gradient-to-br ${accent} w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3`}
          >
            <Icon size={24} className="text-white" />
          </div>
          <div className="font-semibold text-lg mb-1 group-hover:text-indigo-300">
            {title}
          </div>
          <p className="text-sm text-slate-400">{blurb}</p>
          <div className="mt-4 text-xs font-medium text-indigo-400 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0">
            Play →
          </div>
        </NavLink>
      ))}
    </div>
  </DashboardLayout>
);

export default Games;
