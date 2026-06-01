import {
  useCallback,
  useEffect,
  useState,
  type FC,
} from "react";
import { toast } from "react-toastify";
import DashboardLayout from "@/layout/DashboardLayout";
import endpoints from "@/services/endpoints";
import { useSocket } from "@/context/SocketContext";
import type { GamificationProfile } from "@/types";

const BET_CHIPS = [5, 10, 25, 50, 75];

// A standard 52-card deck. Rank value drives comparisons (Ace high = 14).
const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = [
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "J", value: 11 },
  { label: "Q", value: 12 },
  { label: "K", value: 13 },
  { label: "A", value: 14 },
] as const;

type Suit = (typeof SUITS)[number];
interface Card {
  suit: Suit;
  label: string;
  value: number;
}

// Teen Patti hand categories, ordered weakest→strongest.
const HAND_NAMES = [
  "High Card",
  "Pair",
  "Color",
  "Sequence",
  "Pure Sequence",
  "Trail",
] as const;

const randomGameId = () => `teenpatti-${Math.random().toString(36).slice(2, 10)}`;
const newKey = (type: string) =>
  `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const buildDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of SUITS)
    for (const r of RANKS) deck.push({ suit, label: r.label, value: r.value });
  return deck;
};

const drawCards = (deck: Card[], n: number): Card[] => {
  // Fisher–Yates-ish: pick n distinct random cards out of the (mutated) deck.
  const out: Card[] = [];
  for (let i = 0; i < n; i += 1) {
    const idx = Math.floor(Math.random() * deck.length);
    out.push(deck.splice(idx, 1)[0]);
  }
  return out;
};

/**
 * Score a 3-card Teen Patti hand. Returns a [category, ...tiebreakers] tuple
 * that can be compared lexicographically — higher wins.
 */
const scoreHand = (cards: Card[]): { rank: number; name: string; tiebreak: number[] } => {
  const values = cards.map((c) => c.value).sort((a, b) => b - a);
  const [a, b, c] = values;
  const isFlush = cards.every((card) => card.suit === cards[0].suit);

  // Sequence detection, with the A-2-3 wheel as a special low straight.
  const isWheel = a === 14 && b === 3 && c === 2;
  const isRun = a - b === 1 && b - c === 1;
  const isSeq = isRun || isWheel;
  // For the wheel, the effective high card is 3, not the Ace.
  const seqHigh = isWheel ? [3, 2, 1] : values;

  const isTrail = a === b && b === c;
  const isPair = !isTrail && (a === b || b === c);

  if (isTrail) return { rank: 5, name: "Trail", tiebreak: [a] };
  if (isSeq && isFlush)
    return { rank: 4, name: "Pure Sequence", tiebreak: seqHigh };
  if (isSeq) return { rank: 3, name: "Sequence", tiebreak: seqHigh };
  if (isFlush) return { rank: 2, name: "Color", tiebreak: values };
  if (isPair) {
    // Surface the paired rank first, then the kicker.
    const pairVal = a === b ? a : b;
    const kicker = a === b ? c : a;
    return { rank: 1, name: "Pair", tiebreak: [pairVal, kicker] };
  }
  return { rank: 0, name: "High Card", tiebreak: values };
};

/** > 0 if hand1 beats hand2, < 0 if it loses, 0 on a tie. */
const compareHands = (h1: ReturnType<typeof scoreHand>, h2: ReturnType<typeof scoreHand>): number => {
  if (h1.rank !== h2.rank) return h1.rank - h2.rank;
  const len = Math.max(h1.tiebreak.length, h2.tiebreak.length);
  for (let i = 0; i < len; i += 1) {
    const d = (h1.tiebreak[i] ?? 0) - (h2.tiebreak[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

const Stat: FC<{ label: string; value: string | number; accent?: string }> = ({
  label,
  value,
  accent = "text-indigo-400",
}) => (
  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
    <div className="text-slate-400 text-xs uppercase">{label}</div>
    <div className={`text-xl font-bold mt-1 ${accent}`}>{value}</div>
  </div>
);

const PlayingCard: FC<{ card?: Card; hidden?: boolean }> = ({ card, hidden }) => {
  if (hidden || !card) {
    return (
      <div className="w-16 h-24 rounded-lg bg-gradient-to-br from-indigo-700 to-purple-800 border border-indigo-500 flex items-center justify-center shadow-lg">
        <span className="text-2xl opacity-60">🂠</span>
      </div>
    );
  }
  const red = card.suit === "♥" || card.suit === "♦";
  return (
    <div className="w-16 h-24 rounded-lg bg-white border border-slate-300 flex flex-col items-center justify-center shadow-lg">
      <span
        className={`text-xl font-bold ${red ? "text-rose-600" : "text-slate-900"}`}
      >
        {card.label}
      </span>
      <span className={`text-2xl ${red ? "text-rose-600" : "text-slate-900"}`}>
        {card.suit}
      </span>
    </div>
  );
};

type Result = "win" | "lose" | "tie";

const TeenPatti: FC = () => {
  const [p, setP] = useState<GamificationProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const { on } = useSocket();

  const [bet, setBet] = useState(10);
  const [betPlaced, setBetPlaced] = useState(false);
  const [dealing, setDealing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [outcome, setOutcome] = useState<{
    result: Result;
    playerName: string;
    dealerName: string;
    winAmount: number;
  } | null>(null);

  const load = useCallback(async () => {
    const r = await endpoints.profile.get();
    if (r?.success && r.data) setP(r.data);
  }, []);

  useEffect(() => {
    load();
    const off = on("xp:awarded", () => load());
    return off;
  }, [load, on]);

  const placeBet = () => {
    if (dealing || busy || betPlaced) return;
    setBetPlaced(true);
    setOutcome(null);
    setRevealed(false);
    setPlayerCards([]);
    setDealerCards([]);
    toast.info(`Bet placed: ${bet}. Deal the cards!`);
  };

  const deal = async () => {
    if (busy || dealing || !betPlaced) return;
    const deck = buildDeck();
    const player = drawCards(deck, 3);
    const dealer = drawCards(deck, 3);

    setOutcome(null);
    setRevealed(false);
    setDealing(true);
    setPlayerCards(player);
    setDealerCards(dealer);

    // Brief suspense before the reveal.
    await new Promise((r) => setTimeout(r, 700));

    const ph = scoreHand(player);
    const dh = scoreHand(dealer);
    const cmp = compareHands(ph, dh);
    const result: Result = cmp > 0 ? "win" : cmp < 0 ? "lose" : "tie";
    // 2× payout on a win, stake back on a tie, nothing on a loss.
    const winAmount = result === "win" ? bet * 2 : result === "tie" ? bet : 0;

    setRevealed(true);
    setDealing(false);
    setOutcome({
      result,
      playerName: ph.name,
      dealerName: dh.name,
      winAmount,
    });

    if (result === "win") toast.success(`🎉 You win with ${ph.name}!`);
    else if (result === "tie") toast.info(`🤝 Tie — both have ${ph.name}.`);
    else toast.info(`Dealer wins with ${dh.name}.`);

    try {
      setBusy(true);
      const response = await endpoints.activity.record({
        type: "GAME_PLAY",
        gameId: randomGameId(),
        amount: winAmount,
        idempotencyKey: newKey("GAME_PLAY"),
        meta: {
          game: "teen-patti",
          name: "Teen Patti",
          category: "Table Games",
          provider: "Internal",
          bet,
          result,
          playerHand: ph.name,
          dealerHand: dh.name,
          win: result === "win",
          winAmount,
        },
      });
      if (response?.success) {
        toast.success(`+${response.data?.xpAwarded ?? 0} XP for the hand!`);
      }
      await load();
    } catch {
      toast.error("Could not record activity");
    } finally {
      setBetPlaced(false);
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">🃏 Teen Patti</h1>
          <p className="text-slate-400 text-sm mt-1">
            Place a bet, deal three cards each. Beat the dealer's hand to win —
            XP rewards every hand played.
          </p>
        </div>
        {p && (
          <div className="flex gap-3">
            <Stat label="Total XP" value={p.xpTotal} />
            <Stat label="Level" value={p.level} accent="text-emerald-400" />
            <Stat label="Rank" value={p.rank.name} accent="text-amber-400" />
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        {/* Table */}
        <div className="bg-gradient-to-br from-emerald-950 to-slate-950 border border-emerald-900/50 rounded-2xl p-6 mb-6">
          {/* Dealer */}
          <div className="mb-6">
            <div className="text-slate-400 text-xs uppercase mb-2 text-center">
              Dealer {revealed && outcome ? `· ${outcome.dealerName}` : ""}
            </div>
            <div className="flex justify-center gap-3">
              {[0, 1, 2].map((i) => (
                <PlayingCard
                  key={i}
                  card={dealerCards[i]}
                  hidden={!revealed && dealerCards.length > 0}
                />
              ))}
            </div>
          </div>

          <div className="text-center text-slate-600 text-sm mb-6">— vs —</div>

          {/* Player */}
          <div>
            <div className="text-slate-400 text-xs uppercase mb-2 text-center">
              You {revealed && outcome ? `· ${outcome.playerName}` : ""}
            </div>
            <div className="flex justify-center gap-3">
              {[0, 1, 2].map((i) => (
                <PlayingCard key={i} card={playerCards[i]} />
              ))}
            </div>
          </div>
        </div>

        {outcome && (
          <div
            className={`mb-6 text-center px-4 py-3 rounded-lg ${
              outcome.result === "win"
                ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300"
                : outcome.result === "tie"
                ? "bg-amber-500/10 border border-amber-500/30 text-amber-300"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
            }`}
          >
            {outcome.result === "win" ? (
              <>
                🎉 <b>You win!</b> {outcome.playerName} beats {outcome.dealerName}{" "}
                — payout <b>{outcome.winAmount}</b>.
              </>
            ) : outcome.result === "tie" ? (
              <>
                🤝 <b>Tie!</b> Both hold {outcome.playerName} — stake returned.
              </>
            ) : (
              <>
                Dealer's {outcome.dealerName} beats your {outcome.playerName}.
              </>
            )}
          </div>
        )}

        {/* Bet controls */}
        <div className="mb-4">
          <div className="text-slate-400 text-xs uppercase mb-2">Bet amount</div>
          <div className="flex flex-wrap gap-2">
            {BET_CHIPS.map((c) => (
              <button
                key={c}
                disabled={dealing || busy || betPlaced}
                onClick={() => setBet(c)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                  bet === c
                    ? "bg-indigo-600 border-indigo-500"
                    : "bg-slate-800 border-slate-700 hover:bg-slate-700"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy || dealing || betPlaced}
            onClick={placeBet}
            className="bg-slate-800 hover:bg-slate-700 px-5 py-3 rounded-lg font-medium disabled:opacity-60"
          >
            {betPlaced ? `✓ Bet placed (${bet})` : `🎲 Place a bet (${bet})`}
          </button>
          <button
            disabled={busy || dealing || !betPlaced}
            onClick={deal}
            className="bg-indigo-600 hover:bg-indigo-500 px-5 py-3 rounded-lg font-medium disabled:opacity-60"
            title={!betPlaced ? "Place a bet first" : undefined}
          >
            {dealing ? "🃏 Dealing…" : "▶ Deal"}
          </button>
        </div>

        <div className="mt-5 text-xs text-slate-500">
          Hand ranking (high → low):{" "}
          {[...HAND_NAMES].reverse().join(" · ")}
        </div>

        {p && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Level {p.progress.level} progress</span>
              <span>
                {p.progress.xpIntoLevel} / {p.progress.nextLevelXp ?? "max"} XP
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                style={{ width: `${p.progress.progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeenPatti;
