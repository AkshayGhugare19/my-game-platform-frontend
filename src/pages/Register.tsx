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
        className="w-full p-3 bg-slate-800 rounded outline-none"
      />
      {errors[name] && (
        <p className="text-red-400 text-xs mt-1">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900 p-8 rounded-xl w-96 space-y-3 border border-slate-800"
      >
        <h2 className="text-2xl font-bold">Create account</h2>
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
          className="w-full bg-indigo-600 hover:bg-indigo-500 p-3 rounded font-medium disabled:opacity-60"
        >
          {loading ? "Creating..." : "Register"}
        </button>
        <p className="text-sm text-slate-400 text-center">
          Have an account?{" "}
          <Link to="/login" className="text-indigo-400">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
