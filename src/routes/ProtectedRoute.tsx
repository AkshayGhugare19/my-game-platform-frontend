import type { FC } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isWidgetEmbed } from "@/utils/embed";

const ProtectedRoute: FC = () => {
  const { token } = useAuth();
  // When a game runs inside a GAMRU widget iframe (?embed=widget) there is no
  // games-platform session — allow it through (the bare game makes no authed
  // calls that matter; the backend rejects any tokenless request anyway).
  if (isWidgetEmbed()) return <Outlet />;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
