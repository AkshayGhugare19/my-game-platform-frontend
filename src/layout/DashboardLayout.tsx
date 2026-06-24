import {
  useEffect,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Trophy,
  Target,
  Gift,
  User,
  Bell,
  LogOut,
  Medal,
  History,
  Disc3,
  Gamepad2,
  Flame,
  Brain,
  Zap,
  SlidersHorizontal,
  Layers,
  Wallet,
  ShoppingBag,
  ChevronDown,
  Swords,
  type LucideIcon,
  LineSquiggle,
  TrophyIcon,
  AirplayIcon,
  LayoutGrid,
  Mail,
  BadgeDollarSign,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import apiService from "@/services/api";
import { isWidgetEmbed } from "@/utils/embed";

// When a game is loaded inside a GAMRU widget iframe (?embed=widget), strip all
// app chrome (sidebar / header / badge fetches) and render only the game.
const EMBED = isWidgetEmbed();

type BadgeKey = "rewards" | "inbox";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: BadgeKey;
  adminOnly?: boolean;
}

interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  basePath: string;
  children: NavItem[];
}

const nav: Array<NavItem | NavGroup> = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/missions", label: "Missions", icon: Target },
  { to: "/mission-bundles", label: "Mission Bundles", icon: Layers },
  { to: "/tournaments", label: "Tournaments", icon: Swords },
  { to: "/rewards", label: "Rewards", icon: Gift, badgeKey: "rewards" },
  { to: "/reward-shop", label: "My Reward Shop", icon: ShoppingBag },
  { to: "/deposit", label: "Deposit", icon: Wallet },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/rank-progress", label: "Rank Progress", icon: Medal },
  {
    key: "games",
    label: "Games",
    icon: Gamepad2,
    basePath: "/games",
    children: [
      { to: "/games/slider", label: "Slider", icon: SlidersHorizontal },
      { to: "/games/lucky-spinner", label: "Lucky Spinner", icon: Disc3 },
      { to: "/games/dragon-run", label: "Dragon Run", icon: Flame },
      { to: "/games/memory-match", label: "Memory Match", icon: Brain },
      { to: "/games/click-storm", label: "Click Storm", icon: Zap },
      { to: "/games/snake", label: "Snake", icon: LineSquiggle },
      { to: "/games/teen-patti", label: "Teen Patti", icon: TrophyIcon },
      { to: "/games/aviator", label: "Aviator", icon: AirplayIcon },
    ],
  },
  { to: "/game-history", label: "Game History", icon: History },
  { to: "/inbox", label: "Inbox", icon: Mail, badgeKey: "inbox" },
  { to: "/widgets", label: "Widgets", icon: LayoutGrid },
  { to: "/profile", label: "Profile", icon: User },
  {
    to: "/admin/bonuses",
    label: "Bonus Management",
    icon: BadgeDollarSign,
    adminOnly: true,
  },
];

const isGroup = (item: NavItem | NavGroup): item is NavGroup =>
  (item as NavGroup).children !== undefined;

const DashboardLayoutFull: FC<{ children: ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { on } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    games: location.pathname.startsWith("/games"),
  }));

  const loadUnread = async () => {
    try {
      const r = await apiService.get<{ count: number }>(
        "/notifications/unread-count"
      );
      if (r?.success) setUnread(r.data?.count ?? 0);
    } catch {
      /* ignore */
    }
  };

  const loadPendingRewards = async () => {
    try {
      const r = await apiService.get<{ count: number }>(
        "/rewards/pending-count"
      );
      if (r?.success) setPendingRewards(r.data?.count ?? 0);
    } catch {
      /* ignore */
    }
  };

  const loadInboxUnread = async () => {
    try {
      const r = await apiService.get<{ count: number }>("/inbox/unread-count");
      if (r?.success) setInboxUnread(r.data?.count ?? 0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadUnread();
    loadPendingRewards();
    loadInboxUnread();
    const offNotif = on("notification:new", () => {
      setUnread((n) => n + 1);
      loadPendingRewards();
      loadInboxUnread();
    });
    const offReward = on("reward:granted", () => {
      loadPendingRewards();
    });
    return () => {
      offNotif();
      offReward();
    };
  }, [on]);

  // Refresh the inbox unread badge on every navigation: there's no realtime
  // inbox socket event, so re-reading the count as the player moves around
  // (notably leaving /inbox after reading messages) keeps the badge honest.
  useEffect(() => {
    loadInboxUnread();
  }, [location.pathname]);

  // Auto-open a group whenever the route enters it (e.g. external link to
  // /games/dragon-run should leave the Games group expanded on arrival).
  useEffect(() => {
    setOpenGroups((curr) => {
      const next = { ...curr };
      for (const item of nav) {
        if (isGroup(item) && location.pathname.startsWith(item.basePath)) {
          next[item.key] = true;
        }
      }
      return next;
    });
  }, [location.pathname]);

  const badgeFor = (key?: BadgeKey): number | null => {
    if (key === "rewards") return pendingRewards > 0 ? pendingRewards : null;
    if (key === "inbox") return inboxUnread > 0 ? inboxUnread : null;
    return null;
  };

  const renderLeaf = (item: NavItem, indent = false) => {
    const badge = badgeFor(item.badgeKey);
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          `group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 ${
            indent ? "ml-7 pl-3" : ""
          } ${
            isActive
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
              : "text-slate-300 hover:bg-slate-800 hover:translate-x-0.5"
          }`
        }
      >
        <Icon
          size={indent ? 16 : 18}
          className="shrink-0 transition-transform group-hover:scale-110"
        />
        <span className="flex-1">{item.label}</span>
        {badge !== null && (
          <span className="bg-red-500 text-white text-[10px] font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
            {badge}
          </span>
        )}
      </NavLink>
    );
  };

  const renderGroup = (group: NavGroup) => {
    const open = openGroups[group.key] ?? false;
    const active = location.pathname.startsWith(group.basePath);
    const Icon = group.icon;
    return (
      <div key={group.key}>
        <button
          type="button"
          onClick={() =>
            setOpenGroups((curr) => ({ ...curr, [group.key]: !open }))
          }
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
            active
              ? "bg-slate-800 text-white"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          <Icon size={18} />
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="mt-1 space-y-1">
            {group.children.map((c) => renderLeaf(c, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950 text-white">
      <aside className="w-60 shrink-0 h-screen bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 text-xl font-bold tracking-tight shrink-0">
          <span className="mr-1 inline-block animate-float">🎮</span>Gamify
          <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
            Engage
          </span>
        </div>
        <nav className="flex-1 min-h-0 px-3 space-y-1 overflow-y-auto">
          {nav
            .filter(
              (item) =>
                isGroup(item) || !item.adminOnly || user?.role === "ADMIN"
            )
            .map((item) =>
              isGroup(item) ? renderGroup(item) : renderLeaf(item)
            )}
        </nav>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="m-3 shrink-0 flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-slate-800 hover:bg-red-600"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col h-screen">
        <header className="h-14 shrink-0 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-md">
          <div className="text-sm text-slate-400">
            Welcome back,{" "}
            <span className="font-medium text-slate-200">
              {user?.first_name ?? "Player"}
            </span>
          </div>
          <NavLink
            to="/notifications"
            className="relative p-2 rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-slate-950 animate-pulse-glow">
                {unread}
              </span>
            )}
          </NavLink>
        </header>
        <main key={location.pathname} className="flex-1 min-h-0 p-6 overflow-y-auto animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

/**
 * In widget-embed mode render only the game (bare), so a game nested inside a
 * GAMRU widget iframe shows no games-platform chrome. Otherwise the full shell.
 * Kept as a wrapper (no hooks) so `DashboardLayoutFull`'s hooks always run.
 */
const DashboardLayout: FC<{ children: ReactNode }> = ({ children }) =>
  EMBED ? (
    <div className="min-h-screen bg-slate-950 text-white">{children}</div>
  ) : (
    <DashboardLayoutFull>{children}</DashboardLayoutFull>
  );

export default DashboardLayout;
