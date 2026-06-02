import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { toast } from "react-toastify";
import {
  Coins,
  ShoppingBag,
  History,
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  Lock,
  Zap,
  Clock,
} from "lucide-react";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import Pagination from "@/components/Pagination";
import type {
  BoosterRow,
  RewardProduct,
  RewardPurchaseRow,
  RewardShopCatalog,
} from "@/types";

type TabKey = "shop" | "boosters" | "history";

const card = "rounded-xl border border-slate-800 bg-slate-900";

/* ── small presentational helpers ─────────────────────────────────────── */

const TokenPill: FC<{ value: number; sub?: string }> = ({ value, sub }) => (
  <div className="inline-flex items-center gap-2 rounded-lg bg-slate-800/70 px-3 py-2">
    <Coins size={18} className="text-amber-400" />
    <span className="font-semibold text-indigo-300">
      {value.toLocaleString()}
    </span>
    {sub && <span className="text-xs text-slate-400">{sub}</span>}
  </div>
);

const TierBadge: FC<{ tier: string | null }> = ({ tier }) => {
  if (!tier) return null;
  const tone =
    /gold/i.test(tier)
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : /silver/i.test(tier)
        ? "bg-slate-400/15 text-slate-200 border-slate-400/30"
        : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${tone}`}
    >
      <Lock size={10} /> {tier}
    </span>
  );
};

const Price: FC<{ value: number }> = ({ value }) => (
  <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-300">
    <Coins size={15} className="text-amber-400" />
    {value.toLocaleString()}
  </span>
);

/* ── product card ─────────────────────────────────────────────────────── */

const ProductCard: FC<{
  product: RewardProduct;
  onOpen: (p: RewardProduct) => void;
}> = ({ product, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(product)}
    className={`${card} group flex flex-col overflow-hidden text-left transition hover:border-indigo-500/60`}
  >
    <div className="relative flex h-36 items-center justify-center bg-slate-950/40 p-3">
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          className="max-h-full max-w-full object-contain"
          loading="lazy"
        />
      ) : (
        <ShoppingBag size={40} className="text-slate-700" />
      )}
      {product.tier && (
        <div className="absolute left-2 top-2">
          <TierBadge tier={product.tier} />
        </div>
      )}
      {product.category === "booster" && (
        <div className="absolute right-2 top-2 rounded-md bg-fuchsia-500/15 px-1.5 py-0.5 text-[11px] font-medium text-fuchsia-300">
          {product.booster?.multiplier}X
        </div>
      )}
    </div>
    <div className="flex flex-1 flex-col gap-1 p-3">
      <div className="truncate text-sm font-semibold">{product.name}</div>
      <div className="line-clamp-2 text-xs text-slate-400">
        {product.description || "—"}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Price value={product.tokenPrice} />
        {!product.affordable && (
          <span className="text-[11px] text-rose-400">Not enough</span>
        )}
      </div>
    </div>
  </button>
);

/* ── product detail / buy view ────────────────────────────────────────── */

const ProductDetail: FC<{
  product: RewardProduct;
  tokens: number;
  busy: boolean;
  onBack: () => void;
  onBuy: (qty: number) => void;
}> = ({ product, tokens, busy, onBack, onBuy }) => {
  const [qty, setQty] = useState(1);
  const cost = product.tokenPrice * qty;
  const canAfford = tokens >= cost && product.tokenPrice > 0;
  const outOfStock =
    product.stockAvailable !== null && product.stockAvailable <= 0;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft size={16} /> Reward Shop
        <span className="text-slate-600">/ Product Details</span>
      </button>

      <div className="grid gap-6 md:grid-cols-2">
        <div className={`${card} flex h-80 items-center justify-center p-6`}>
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <ShoppingBag size={72} className="text-slate-700" />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold">{product.name}</h2>
          <div className="mt-1 flex items-center gap-2">
            {product.tier && <TierBadge tier={product.tier} />}
            <span
              className={`text-sm font-medium ${
                outOfStock ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {outOfStock ? "Out of Stock" : "In Stock"}
            </span>
          </div>

          <p className="mt-3 text-sm text-slate-300">
            {product.description || "No description provided."}
          </p>

          {product.category === "booster" && product.booster && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-fuchsia-500/10 px-3 py-2 text-sm text-fuchsia-300">
              <Zap size={15} />
              {product.booster.multiplier}× {product.booster.kind} boost for{" "}
              {product.booster.durationMinutes} min
            </div>
          )}

          <div className="mt-4 rounded-lg bg-indigo-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-lg">
              <Coins size={18} className="text-amber-400" />
              <span className="font-bold text-indigo-300">
                {cost.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-indigo-300/70">
              Remaining Tokens: {tokens.toLocaleString()}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="inline-flex items-center rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-slate-300 hover:text-white"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center text-sm">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(99, q + 1))}
                className="px-3 py-2 text-slate-300 hover:text-white"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <button
            type="button"
            disabled={busy || !canAfford || outOfStock}
            onClick={() => onBuy(qty)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Processing…" : "Buy Now"} <ArrowRight size={16} />
          </button>
          {!canAfford && !outOfStock && (
            <p className="mt-2 text-xs text-rose-400">
              You need {(cost - tokens).toLocaleString()} more tokens.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── grouped shop grid ────────────────────────────────────────────────── */

const Section: FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section className="mb-8">
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
      {title}
    </h3>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {children}
    </div>
  </section>
);

/* ── boosters tab ─────────────────────────────────────────────────────── */

const fmtRemaining = (s: number | null): string => {
  if (s === null) return "Permanent";
  if (s <= 0) return "Expired";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s left` : `${sec}s left`;
};

const BoostersTab: FC<{ boosters: BoosterRow[] }> = ({ boosters }) => {
  if (!boosters.length)
    return (
      <div className="py-16 text-center text-slate-500">
        No active boosters. Buy one from the shop to multiply your rewards.
      </div>
    );
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {boosters.map((b) => (
        <div key={b.id} className={`${card} flex items-center gap-3 p-4`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-fuchsia-500/15 text-fuchsia-300">
            {b.image ? (
              <img src={b.image} alt="" className="h-9 w-9 object-contain" />
            ) : (
              <Zap size={22} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{b.name}</div>
            <div className="text-xs text-fuchsia-300">
              {b.multiplier}× {b.kind} boost
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
              <Clock size={12} /> {fmtRemaining(b.secondsRemaining)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── history tab ──────────────────────────────────────────────────────── */

const HistoryTab: FC<{ rows: RewardPurchaseRow[] }> = ({ rows }) => {
  if (!rows.length)
    return (
      <div className="py-16 text-center text-slate-500">
        No purchases yet.
      </div>
    );
  return (
    <div className={`${card} overflow-hidden`}>
      <table className="w-full text-sm">
        <thead className="bg-slate-800/50 text-left text-xs uppercase text-slate-400">
          <tr>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Qty</th>
            <th className="px-4 py-3">Tokens</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-800">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {r.image && (
                    <img
                      src={r.image}
                      alt=""
                      className="h-8 w-8 rounded object-contain"
                    />
                  )}
                  <span className="font-medium">{r.productName}</span>
                </div>
              </td>
              <td className="px-4 py-3 capitalize text-slate-400">
                {r.category}
              </td>
              <td className="px-4 py-3 text-slate-400">{r.quantity}</td>
              <td className="px-4 py-3">
                <Price value={r.tokenCost} />
              </td>
              <td className="px-4 py-3 text-slate-400">
                {new Date(r.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── page ─────────────────────────────────────────────────────────────── */

const RewardShop: FC = () => {
  const [tab, setTab] = useState<TabKey>("shop");
  const [catalog, setCatalog] = useState<RewardShopCatalog | null>(null);
  const [boosters, setBoosters] = useState<BoosterRow[]>([]);
  const [boostMeta, setBoostMeta] = useState({ totalPages: 1, total: 0 });
  const [history, setHistory] = useState<RewardPurchaseRow[]>([]);
  const [histMeta, setHistMeta] = useState({ totalPages: 1, total: 0 });
  const [prodPage, setProdPage] = useState(1);
  const [boostPage, setBoostPage] = useState(1);
  const [histPage, setHistPage] = useState(1);
  const [selected, setSelected] = useState<RewardProduct | null>(null);
  const [busy, setBusy] = useState(false);

  const loadCatalog = useCallback(async () => {
    const r = await endpoints.rewardShop.products(prodPage);
    if (r?.success && r.data) setCatalog(r.data);
  }, [prodPage]);

  const loadBoosters = useCallback(async () => {
    const r = await endpoints.rewardShop.boosters(boostPage);
    if (r?.success && r.data) {
      setBoosters(r.data.data);
      setBoostMeta(r.data.pagination);
    }
  }, [boostPage]);

  const loadHistory = useCallback(async () => {
    const r = await endpoints.rewardShop.history(histPage);
    if (r?.success && r.data) {
      setHistory(r.data.data);
      setHistMeta(r.data.pagination);
    }
  }, [histPage]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);
  useEffect(() => {
    loadBoosters();
  }, [loadBoosters]);
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loading = catalog === null;
  const tokens = catalog?.tokens ?? 0;
  const products = catalog?.data ?? [];
  const prodMeta = catalog?.pagination;

  // Group by the admin-chosen category label (Product / Booster / Voucher…),
  // preserving first-seen order so the catalog's priority order is honoured.
  const grouped = useMemo(() => {
    const map = new Map<string, RewardProduct[]>();
    for (const p of products) {
      const key =
        p.categoryLabel || (p.category === "booster" ? "Booster" : "Product");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return Array.from(map.entries());
  }, [products]);

  const handleBuy = async (qty: number) => {
    if (!selected) return;
    setBusy(true);
    try {
      const r = await endpoints.rewardShop.buy(selected.id, qty);
      if (r?.success && r.data) {
        toast.success(
          r.data.boosterActivated
            ? `${selected.name} activated!`
            : `Bought ${selected.name}!`
        );
        // Refresh balance, inventory and history after a successful spend.
        await Promise.all([loadCatalog(), loadBoosters(), loadHistory()]);
        setSelected(null);
        if (r.data.boosterActivated) setTab("boosters");
      } else {
        toast.error(r?.message || "Purchase failed");
      }
    } catch {
      toast.error("Purchase failed");
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ key: TabKey; label: string; icon: typeof ShoppingBag; badge?: number }> =
    [
      { key: "shop", label: "Reward Shop", icon: ShoppingBag },
      { key: "boosters", label: "My Boosters", icon: Zap, badge: boostMeta.total },
      { key: "history", label: "Shop History", icon: History },
    ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Reward Shop</h1>
        <TokenPill value={tokens} sub="tokens" />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-800">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setSelected(null);
              }}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon size={16} /> {t.label}
              {t.badge ? (
                <span className="rounded-full bg-fuchsia-500 px-1.5 text-[10px] font-semibold text-white">
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading…</div>
      ) : tab === "shop" ? (
        selected ? (
          <ProductDetail
            product={selected}
            tokens={tokens}
            busy={busy}
            onBack={() => setSelected(null)}
            onBuy={handleBuy}
          />
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            No products available yet. Check back soon.
          </div>
        ) : (
          <>
            {grouped.map(([label, items]) => (
              <Section key={label} title={label}>
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} onOpen={setSelected} />
                ))}
              </Section>
            ))}
            <Pagination
              page={prodPage}
              totalPages={prodMeta?.totalPages ?? 1}
              total={prodMeta?.total}
              onChange={setProdPage}
            />
          </>
        )
      ) : tab === "boosters" ? (
        <>
          <BoostersTab boosters={boosters} />
          <Pagination
            page={boostPage}
            totalPages={boostMeta.totalPages}
            total={boostMeta.total}
            onChange={setBoostPage}
          />
        </>
      ) : (
        <>
          <HistoryTab rows={history} />
          <Pagination
            page={histPage}
            totalPages={histMeta.totalPages}
            total={histMeta.total}
            onChange={setHistPage}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default RewardShop;
