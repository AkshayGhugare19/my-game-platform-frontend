import { useState, type FC, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import apiService from "@/services/api";
import { encryptPassword } from "@/utils/crypto";
import type { ApiError } from "@/types";

const initial = {
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  password: "",
  source: "GAMIFY_ENGAGE",
};

const Register: FC = () => {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k: keyof typeof initial, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrors({});
      const res = await apiService.post("/auth/register", {
        ...form,
        source: form.source || "GAMIFY_ENGAGE",
        password: await encryptPassword(form.password),
      });
      if (res?.success) {
        toast.success("Registered! You're onboarded — please log in.");
        navigate("/login");
      } else {
        toast.error(res?.message || "Registration failed");
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.errors) setErrors(apiErr.errors);
      else toast.error(apiErr?.message || "Registration error");
    } finally {
      setLoading(false);
    }
  };

  const field = (
    name: keyof typeof initial,
    placeholder: string,
    type = "text"
  ) => (
    <div>
      <input
        type={type}
        value={form[name]}
        onChange={(e) => set(name, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-slate-800/70 p-3 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
      />
      {errors[name] && (
        <p className="text-red-400 text-xs mt-1">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 text-white px-4">
      {/* Animated ambient background */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl animate-float"
        style={{ animationDelay: "1.5s" }}
      />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl animate-scale-in"
      >
        <h2 className="text-2xl font-bold">
          Create <span className="text-gradient">account</span>
        </h2>
        <p className="text-sm text-slate-400">
          You'll be auto-onboarded into the gamification platform.
        </p>
        {field("first_name", "First name")}
        {field("last_name", "Last name")}
        {field("email", "Email")}
        {field("mobile", "Mobile (10–15 digits)")}
        {field("password", "Password", "password")}
        <button
          disabled={loading}
          className="btn-primary w-full p-3"
        >
          {loading ? "Creating..." : "Register"}
        </button>
        <p className="text-sm text-slate-400 text-center">
          Have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-400 hover:text-indigo-300"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
