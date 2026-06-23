import { useEffect, useState, type FC, type FormEvent } from "react";
import { toast } from "react-toastify";
import { Wallet as WalletIcon } from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import type { Wallet } from "@/types";

const card = "rounded-xl border border-slate-800 bg-slate-900 p-5";

const QUICK_AMOUNTS = [10, 25, 50, 100];

const Deposit: FC = () => {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await endpoints.wallet.get();
        if (res?.success && res.data) setWallet(res.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDeposit = async (e: FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount greater than 0");
      return;
    }
    setSubmitting(true);
    try {
      const res = await endpoints.wallet.deposit(value);
      if (res?.success && res.data) {
        setWallet(res.data);
        setAmount("");
        toast.success(`Deposited ${value.toFixed(2)} to your wallet`);
      } else {
        toast.error(res?.message || "Deposit failed");
      }
    } catch {
      toast.error("Deposit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const currency = wallet?.currency ?? "USD";

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Deposit</h1>

      {loading && (
        <div className="text-slate-500 py-10 text-center">Loading wallet…</div>
      )}

      {!loading && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Balance */}
          <div className={card}>
            <div className="flex items-center gap-3 mb-4">
              <span className="rounded-lg bg-indigo-600/20 p-2 text-indigo-400">
                <WalletIcon className="h-6 w-6" />
              </span>
              <div>
                <div className="text-sm text-slate-400">Wallet balance</div>
                <div className="text-3xl font-bold">
                  {currency} {(wallet?.balance ?? 0).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div className="rounded-lg bg-slate-800 p-3">
                <div className="text-slate-400">Real Money</div>
                <div className="text-lg font-semibold text-emerald-400">
                  {currency} {(wallet?.realMoney ?? 0).toFixed(2)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-800 p-3">
                <div className="text-slate-400">Bonus Money</div>
                <div className="text-lg font-semibold text-amber-400">
                  {currency} {(wallet?.bonusMoney ?? 0).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-800 p-3">
                <div className="text-slate-400">Deposits</div>
                <div className="text-lg font-semibold">
                  {wallet?.depositCount ?? 0}
                </div>
              </div>
              <div className="rounded-lg bg-slate-800 p-3">
                <div className="text-slate-400">Total deposited</div>
                <div className="text-lg font-semibold">
                  {currency} {(wallet?.totalDeposit ?? 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Deposit form */}
          <form className={card} onSubmit={handleDeposit}>
            <h2 className="text-lg font-semibold mb-4">Add funds</h2>

            <label className="block text-sm text-slate-400 mb-2" htmlFor="amount">
              Amount ({currency})
            </label>
            <input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
                >
                  +{q}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {submitting ? "Processing…" : "Deposit"}
            </button>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Deposit;
