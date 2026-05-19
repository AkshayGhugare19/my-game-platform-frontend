import { useState, type FC, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <form
        onSubmit={handleLogin}
        className="bg-slate-900 p-8 rounded-xl w-96 space-y-4 border border-slate-800"
      >
        <h2 className="text-2xl font-bold">
          🎮 Gamify<span className="text-indigo-400">Engage</span>
        </h2>
        <p className="text-sm text-slate-400">Sign in to your account</p>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 bg-slate-800 rounded outline-none"
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 bg-slate-800 rounded outline-none"
          placeholder="Password"
        />
        <button
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 p-3 rounded font-medium disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
        <p className="text-sm text-slate-400 text-center">
          No account?{" "}
          <Link to="/register" className="text-indigo-400">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
