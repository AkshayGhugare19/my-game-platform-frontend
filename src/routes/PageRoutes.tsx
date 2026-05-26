import type { FC } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import Missions from "@/pages/Missions";
import Rewards from "@/pages/Rewards";
import Leaderboard from "@/pages/Leaderboard";
import RankProgress from "@/pages/RankProgress";
import GameHistory from "@/pages/GameHistory";
import LuckySpinner from "@/pages/LuckySpinner";
import Notifications from "@/pages/Notifications";
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
      <Route path="/rewards" element={<Rewards />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/rank-progress" element={<RankProgress />} />
      <Route path="/lucky-spinner" element={<LuckySpinner />} />
      <Route path="/game-history" element={<GameHistory />} />
      <Route path="/notifications" element={<Notifications />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default PageRoutes;
