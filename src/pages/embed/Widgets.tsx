import { useEffect, useMemo, useState, type FC } from "react";
import DashboardLayout from "@/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";

/**
 * Embedded GAMRU widgets — consumed via the official drop-in SDK.
 *
 * The page only shows widgets that an admin has actually CREATED in gamru: we
 * fetch the client's active widgets from `/api/widget/list`, then render each
 * one as `<div class="gamification_widget" data-type="…">`. gamru's `embed.js`
 * turns each div into a self-sizing, gamru-styled widget. No hand-built iframes.
 */

declare global {
  interface Window {
    GamruWidgets?: { scan: (root?: Element) => void; mount: (el: Element) => void };
  }
}

const GAMRU_BASE =
  (import.meta.env.VITE_GAMRU_WIDGET_BASE as string | undefined) || "http://localhost:5173";
const GAMRU_API =
  (import.meta.env.VITE_GAMRU_API_BASE as string | undefined) || "http://localhost:5000/api";
const CLIENT_ID = (import.meta.env.VITE_GAMRU_CLIENT_ID as string | undefined) || "";
const AUTH_KEY = (import.meta.env.VITE_GAMRU_WIDGET_AUTH_KEY as string | undefined) || "";

interface WidgetItem {
  id: string;
  name: string;
  type: string;
}

const INLINE = new Set(["avatar", "tokens", "badge-level", "points", "gamification-data"]);

const META: Record<string, { label: string; emoji: string }> = {
  mission: { label: "Missions", emoji: "🎯" },
  "mission-bundle": { label: "Mission Bundles", emoji: "🧩" },
  tournament: { label: "Tournaments", emoji: "⚔️" },
  "reward-shop": { label: "Reward Shop", emoji: "🛍️" },
  rewards: { label: "Rewards", emoji: "🎁" },
  campaign: { label: "Campaigns", emoji: "📣" },
  rankings: { label: "Rankings", emoji: "🏆" },
  profile: { label: "Profile", emoji: "👤" },
  status: { label: "Status", emoji: "✅" },
  progress: { label: "Progress", emoji: "📈" },
  points: { label: "Points", emoji: "✨" },
  avatar: { label: "Avatar", emoji: "🧑" },
  tokens: { label: "Tokens", emoji: "🪙" },
  "badge-level": { label: "Level", emoji: "🔼" },
  "gamification-data": { label: "Stat", emoji: "📊" },
};

/** Render a created widget as the SDK div, with sensible defaults per type. */
const WidgetDiv: FC<{ type: string }> = ({ type }) => {
  if (type === "avatar") {
    return (
      <div
        className="gamification_widget"
        data-type="avatar"
        data-size="110"
        data-show-level="true"
        data-progress-type="rank"
      />
    );
  }
  return <div className="gamification_widget" data-type={type} />;
};

const Widgets: FC = () => {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<WidgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sdkReady, setSdkReady] = useState(Boolean(window.GamruWidgets));

  // Fetch which widgets the admin created (active ones) for this client.
  useEffect(() => {
    if (!AUTH_KEY) {
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    if (CLIENT_ID) params.set("clientId", CLIENT_ID);
    params.set("authKey", AUTH_KEY);
    fetch(`${GAMRU_API}/widget/list?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => setWidgets(Array.isArray(j?.data) ? (j.data as WidgetItem[]) : []))
      .catch(() => setWidgets([]))
      .finally(() => setLoading(false));
  }, []);

  // Load gamru's embed.js once, configured for this client + player.
  useEffect(() => {
    if (!AUTH_KEY) return;
    if (window.GamruWidgets) {
      setSdkReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-gamru-embed]");
    if (existing) {
      existing.addEventListener("load", () => setSdkReady(true));
      return;
    }
    const s = document.createElement("script");
    s.src = `${GAMRU_BASE}/embed.js`;
    s.async = true;
    s.setAttribute("data-gamru-embed", "");
    s.dataset.base = GAMRU_BASE;
    if (CLIENT_ID) s.dataset.clientId = CLIENT_ID;
    s.dataset.authKey = AUTH_KEY;
    if (user?.email) s.dataset.email = user.email;
    // NOTE: the user frontend stays a pure renderer — it passes only
    // email/authKey/clientId. Where the games live (for in-widget play) is
    // GAMRU-side config (VITE_GAMES_PLATFORM_BASE on the widget build, or a
    // per-script data-games-base override); the SDK owns all game/mission logic.
    s.onload = () => setSdkReady(true);
    document.body.appendChild(s);
  }, [user?.email]);

  const inlineWidgets = useMemo(() => widgets.filter((w) => INLINE.has(w.type)), [widgets]);
  const pageWidgets = useMemo(() => widgets.filter((w) => !INLINE.has(w.type)), [widgets]);
  // `points` is wide (full card); the rest are small stat tiles.
  const pointsWidgets = useMemo(() => inlineWidgets.filter((w) => w.type === "points"), [inlineWidgets]);
  const statWidgets = useMemo(() => inlineWidgets.filter((w) => w.type !== "points"), [inlineWidgets]);

  // (Re)mount widgets once the SDK is ready and whenever the list changes.
  useEffect(() => {
    if (sdkReady) window.GamruWidgets?.scan();
  }, [sdkReady, widgets]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          <h1 className="text-2xl font-bold">Widgets</h1>
          <p className="mt-1 text-sm text-slate-400">
            GAMRU widgets embedded with the drop-in SDK (<code>gamification_widget</code>).
          </p>
        </header>

        {!AUTH_KEY && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            Set <code>VITE_GAMRU_WIDGET_AUTH_KEY</code> in the frontend <code>.env</code> to load
            widgets.
          </div>
        )}

        {AUTH_KEY && loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center text-sm text-slate-400">
            Loading widgets…
          </div>
        )}

        {AUTH_KEY && !loading && widgets.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center">
            <p className="text-sm font-medium text-slate-300">No widgets available yet</p>
            <p className="mt-1 text-xs text-slate-500">
              An administrator hasn't created any widgets in GAMRU for this site.
            </p>
          </div>
        )}

        {/* ── Player stats (only inline widgets created in gamru) ───────── */}
        {inlineWidgets.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Your stats
            </h2>

            {/* small stat tiles */}
            {statWidgets.length > 0 && (
              <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {statWidgets.map((w) => (
                  <div
                    key={w.id}
                    className="flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-slate-700"
                  >
                    <p className="text-xs font-medium text-slate-400">
                      {META[w.type]?.emoji} {w.name || META[w.type]?.label}
                    </p>
                    <div className="flex flex-1 items-center justify-center">
                      <WidgetDiv type={w.type} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* wide points cards */}
            {pointsWidgets.map((w) => (
              <div
                key={w.id}
                className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
              >
                <p className="mb-3 text-xs font-medium text-slate-400">
                  {META[w.type]?.emoji} {w.name || META[w.type]?.label}
                </p>
                <WidgetDiv type={w.type} />
              </div>
            ))}
          </section>
        )}

        {/* ── Features (each created page widget = its own section) ─────── */}
        {pageWidgets.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Features
            </h2>
            {pageWidgets.map((w) => (
              <div
                key={w.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg shadow-black/20"
              >
                <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300">
                  <span>{META[w.type]?.emoji}</span>
                  {w.name || META[w.type]?.label || w.type}
                </div>
                <div className="p-3">
                  <WidgetDiv type={w.type} />
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Widgets;
