import type { FC } from "react";
import { Link } from "react-router-dom";

const NotFound: FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
    <h1 className="text-5xl font-bold">404</h1>
    <p className="text-slate-400">Page not found</p>
    <Link to="/dashboard" className="text-indigo-400">
      Back to dashboard
    </Link>
  </div>
);

export default NotFound;
