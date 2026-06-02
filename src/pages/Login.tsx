import { useState, type FC, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Mail, Lock, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import apiService from "@/services/api";
import { encryptPassword } from "@/utils/crypto";
import type { ApiError, LoginResponseData } from "@/types";

const Login: FC = () => {
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      setLoading(true);
      const securePassword = await encryptPassword(password);
      const res = await apiService.post<LoginResponseData>("/auth/login", {
        email,
        password: securePassword,
      });
      if (res?.success && res.data?.accessToken) {
        login(res.data);
        toast.success("Login successful");
        navigate("/dashboard");
      } else {
        toast.error(res?.message || "Login failed");
      }
    } catch (err) {
      toast.error((err as ApiError)?.message || "Login error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 text-white px-4">
      {/* Animated ambient background */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl animate-float"
        style={{ animationDelay: "1.5s" }}
      />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />

      <form
        onSubmit={handleLogin}
        className="relative z-10 w-full max-w-sm space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl animate-scale-in"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 text-2xl shadow-lg shadow-indigo-500/30 animate-pulse-glow">
            🎮
          </div>
          <h2 className="text-2xl font-bold">
            Gamify<span className="text-gradient">Engage</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">Sign in to your account</p>
        </div>

        <div className="relative">
          <Mail
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/70 py-3 pl-10 pr-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Email"
          />
        </div>

        <div className="relative">
          <Lock
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/70 py-3 pl-10 pr-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            placeholder="Password"
          />
        </div>

        <button
          disabled={loading}
          className="btn-primary flex w-full items-center justify-center gap-2 p-3"
        >
          {loading ? (
            "Signing in..."
          ) : (
            <>
              <LogIn size={18} /> Login
            </>
          )}
        </button>
        <p className="text-center text-sm text-slate-400">
          No account?{" "}
          <Link
            to="/register"
            className="font-medium text-indigo-400 hover:text-indigo-300"
          >
            Register
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
