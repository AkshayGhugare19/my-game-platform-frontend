import { useEffect, useState, type FC, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import apiService from "@/services/api";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/missions", label: "Missions", icon: Target },
  { to: "/rewards", label: "Rewards", icon: Gift },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/rank-progress", label: "Rank Progress", icon: Medal },
  { to: "/lucky-spinner", label: "Lucky Spinner", icon: Disc3 },
  { to: "/game-history", label: "Game History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
];

const DashboardLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { on } = useSocket();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

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

  useEffect(() => {
    loadUnread();
    const off = on("notification:new", () => setUnread((n) => n + 1));
    return off;
  }, [on]);

  return (
    <div className="min-h-screen flex bg-slate-950 text-white">
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-5 text-xl font-bold tracking-tight">
          🎮 Gamify<span className="text-indigo-400">Engage</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="m-3 flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-slate-800 hover:bg-red-600"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-6">
          <div className="text-sm text-slate-400">
            Welcome back, {user?.first_name ?? "Player"}
          </div>
          <NavLink
            to="/notifications"
            className="relative p-2 rounded-md hover:bg-slate-800"
          >
            <Bell size={20} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unread}
              </span>
            )}
          </NavLink>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
