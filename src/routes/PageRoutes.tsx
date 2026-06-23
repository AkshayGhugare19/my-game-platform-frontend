import type { FC } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Missions from "@/pages/Missions";
import MissionBundles from "@/pages/MissionBundles";
import Tournaments from "@/pages/Tournaments";
import TournamentDetail from "@/pages/TournamentDetail";
import Rewards from "@/pages/Rewards";
import RewardShop from "@/pages/RewardShop";
import Deposit from "@/pages/Deposit";
import Leaderboard from "@/pages/Leaderboard";
import RankProgress from "@/pages/RankProgress";
import GameHistory from "@/pages/GameHistory";
import Games from "@/pages/Games";
import LuckySpinner from "@/pages/LuckySpinner";
import Slider from "@/pages/games/Slider";
import DragonRun from "@/pages/games/DragonRun";
import MemoryMatch from "@/pages/games/MemoryMatch";
import ClickStorm from "@/pages/games/ClickStorm";
import Snake from "@/pages/games/Snake";
import TeenPatti from "@/pages/games/TeenPatti";
import Aviator from "@/pages/games/Aviator";
import Notifications from "@/pages/Notifications";
import Inbox from "@/pages/Inbox";
import AdminBonuses from "@/pages/admin/Bonuses";
import Widgets from "@/pages/embed/Widgets";
import NotFound from "@/pages/NotFound";

const PageRoutes: FC = () => (
  <Routes>
    <Route element={<PublicRoute />}>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/missions" element={<Missions />} />
      <Route path="/mission-bundles" element={<MissionBundles />} />
      <Route path="/tournaments" element={<Tournaments />} />
      <Route path="/tournaments/:id" element={<TournamentDetail />} />
      <Route path="/rewards" element={<Rewards />} />
      <Route path="/reward-shop" element={<RewardShop />} />
      <Route path="/deposit" element={<Deposit />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/rank-progress" element={<RankProgress />} />
      <Route path="/games" element={<Games />} />
      <Route path="/games/slider" element={<Slider />} />
      <Route path="/games/lucky-spinner" element={<LuckySpinner />} />
      <Route path="/games/dragon-run" element={<DragonRun />} />
      <Route path="/games/memory-match" element={<MemoryMatch />} />
      <Route path="/games/click-storm" element={<ClickStorm />} />
      <Route path="/games/snake" element={<Snake />} />
      <Route path="/games/teen-patti" element={<TeenPatti />} />
      <Route path="/games/aviator" element={<Aviator />} />
      {/* Back-compat with the old direct route used by older bookmarks. */}
      <Route
        path="/lucky-spinner"
        element={<Navigate to="/games/lucky-spinner" replace />}
      />
      <Route path="/game-history" element={<GameHistory />} />
      <Route path="/widgets" element={<Widgets />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/inbox" element={<Inbox />} />
    </Route>

    <Route element={<AdminRoute />}>
      <Route path="/admin/bonuses" element={<AdminBonuses />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default PageRoutes;
