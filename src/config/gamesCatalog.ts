import {
  Disc3,
  Flame,
  Brain,
  Zap,
  SlidersHorizontal,
  Worm,
  Spade,
  Plane,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";

export interface GameMeta {
  /** Route key — also the value stored on a tournament's `games`. */
  key: string;
  title: string;
  blurb: string;
  icon: LucideIcon;
  /** Tailwind gradient classes for the tile accent. */
  accent: string;
}

/** Single source of truth for the platform's games, keyed by route segment. */
export const GAME_CATALOG: Record<string, GameMeta> = {
  slider: {
    key: "slider",
    title: "Slider Game",
    blurb: "Stop the marker past your bet line to win.",
    icon: SlidersHorizontal,
    accent: "from-sky-500 to-blue-500",
  },
  "lucky-spinner": {
    key: "lucky-spinner",
    title: "Lucky Spinner",
    blurb: "Pick a number, spin the wheel, win big.",
    icon: Disc3,
    accent: "from-indigo-500 to-purple-500",
  },
  "dragon-run": {
    key: "dragon-run",
    title: "Dragon Run",
    blurb: "Jump over walls. Grab gems. One hit ends it.",
    icon: Flame,
    accent: "from-rose-500 to-orange-500",
  },
  "memory-match": {
    key: "memory-match",
    title: "Memory Match",
    blurb: "Flip cards, pair them up. Fewer moves = more XP.",
    icon: Brain,
    accent: "from-emerald-500 to-cyan-500",
  },
  "click-storm": {
    key: "click-storm",
    title: "Click Storm",
    blurb: "15 seconds. Hit every target. Beat your record.",
    icon: Zap,
    accent: "from-amber-500 to-yellow-500",
  },
  snake: {
    key: "snake",
    title: "Snake",
    blurb: "Eat apples, grow longer. Don't bite your tail.",
    icon: Worm,
    accent: "from-green-500 to-emerald-500",
  },
  "teen-patti": {
    key: "teen-patti",
    title: "Teen Patti",
    blurb: "Three cards each. Beat the dealer's hand to win.",
    icon: Spade,
    accent: "from-fuchsia-500 to-purple-600",
  },
  aviator: {
    key: "aviator",
    title: "Aviator",
    blurb: "Cash out before the plane flies away. Greed crashes.",
    icon: Plane,
    accent: "from-red-500 to-rose-600",
  },
};

/** Lookup with a safe fallback for unknown keys. */
export const gameMeta = (key: string): GameMeta =>
  GAME_CATALOG[key] ?? {
    key,
    title: key,
    blurb: "Play this game.",
    icon: Gamepad2,
    accent: "from-slate-500 to-slate-600",
  };
