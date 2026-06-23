export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string> | null;
  timestamp?: string;
}

export interface ApiError {
  success?: false;
  message: string;
  errors?: Record<string, string> | null;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role?: string;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  login: (data: LoginResponseData) => void;
  logout: () => void;
}

export interface LevelProgress {
  level: number;
  xpTotal: number;
  xpIntoLevel: number;
  nextLevelXp: number | null;
  progressPct: number;
}

/** The rank the player is climbing toward, with its unlock reward. */
export interface NextRank {
  code: string;
  name: string;
  level: number;
  xpRequired: number;
  xpRemaining: number;
  rewardType: string | null;
  rewardValue: number | null;
}

/** A single level band in the player's progression roadmap. */
export interface LevelTier {
  level: number;
  rankCode: string;
  rankName: string;
  xpStart: number;
  xpEnd: number;
  rewardType: string | null;
  rewardValue: number | null;
  state: "completed" | "current" | "locked";
}

/** A rank tier as defined in Hamara. */
export interface RankTier {
  id: string;
  code: string;
  name: string;
  description: string;
}

/** An audited gamification action (XP adjustments, rank ups, …). */
export interface ActivityLog {
  id: string;
  action: string;
  detail: string;
  actor: string;
  created_at: string;
}

export interface GamificationProfile {
  user: AuthUser;
  xpTotal: number;
  level: number;
  maxLevel: number;
  rank: {
    code: string;
    name: string;
    next: { code: string; name: string; minXp: number; minLevel: number } | null;
  };
  coins: number;
  streak: { current: number; longest: number };
  progress: LevelProgress;
  nextRank: NextRank | null;
  levels: LevelTier[];
  ranks: RankTier[];
  logs: ActivityLog[];
}

/**
 * A mission as authored in Gamru and served by /api/missions. The player's
 * participation (status + progress) is merged in by the games backend.
 */
export type MissionStatus =
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLAIMED";

export interface Mission {
  id: string;
  name: string;
  description: string | null;
  category: string; // Slots / Originals / Sport / …
  bucket: "Casino" | "Sport";
  vip: boolean;
  duration_days: number | null;
  large_image: string | null;
  status: MissionStatus;
  objective_type: string;
  measure: string; // "count" | "amount"
  target: number;
  progress: number;
  condition: string; // e.g. "Wager $15 000"
  game_category: string | null;
  min_bet: number | null;
  min_multiplier: number | null;
  bet_currency: string;
  games: string[];
  start_date: string | null;
  end_date: string | null;
  reward_type: string;
  reward_amount: number;
  reward_label: string; // e.g. "50 Bonus Bets x $2"
  max_bonus: number | null;
  bonus_wagering: string;
  deposit_required: boolean;
  wagering_required: boolean;
  more_details: string | null;
  tags: string[];
}

export interface MissionBranding {
  banner_desktop: string | null;
  banner_mobile: string | null;
}

export interface MissionListResult {
  branding: MissionBranding;
  missions: Mission[];
}

/**
 * A mission bundle as authored in Gamru and served by /api/mission-bundles.
 * A bundle is a curated GROUPING of missions — it has no reward of its own;
 * the player joins/claims each grouped mission individually (reusing the
 * mission flow). `completed`/`total` give the bundle's aggregate progress.
 */
export interface MissionBundle {
  id: string;
  name: string;
  description: string | null;
  large_image: string | null;
  small_image: string | null;
  bundle_type: string | null;
  periodicity: string | null;
  priority: number;
  eligibility_type: string | null;
  segments: string[];
  tags: string[];
  missions: Mission[];
  total: number;
  completed: number;
}

export interface MissionBundleListResult {
  branding: MissionBranding;
  bundles: MissionBundle[];
}

/**
 * Reward row as returned by gamru (`player_rewards`). Mission/level
 * rewards auto-granted by gamru and admin-issued manual rewards both
 * share this shape — only `gamification_source` and `is_manual` differ.
 */
export interface UserReward {
  id: string;
  status: string;
  granted_date?: string | null;
  gamification_source?: string | null;
  reward_type?: string | null;
  reward?: string | null;
  is_manual?: boolean;
  created_at?: string;
  /** Set on locally-granted bonus rows so the claim routes to /bonuses/:id/claim. */
  is_bonus?: boolean;
  amount?: number;
  amount_type?: "RM" | "BM";
}

/** A bonus definition in the games-platform catalog (admin Bonus Management). */
export interface Bonus {
  id: string;
  bonusName: string;
  bonusType: string;
  amount: number;
  amountType: "RM" | "BM";
  status: "ACTIVE" | "INACTIVE";
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  score: number;
  name?: string;
}

export interface LeaderboardData {
  board: string;
  rows: LeaderboardRow[];
  me: LeaderboardRow | null;
  pagination: PaginatedData<LeaderboardRow>["pagination"];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/** One on-site campaign message delivered by GAMRU (the inbox). */
export interface InboxItem {
  id: string;
  campaign_id: string | null;
  channel: string;
  title: string;
  body: string;
  status: string;
  read: boolean;
  event_label: string | null;
  event_at: string;
  read_at: string | null;
}

export interface InboxResponse {
  unread_count: number;
  items: InboxItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Mirrors the backend `recordActivity` return shape. */
export interface ActivityResult {
  duplicate: boolean;
  xpAwarded: number;
  breakdown: {
    base: number;
    streakBonus: number;
    dailyBonus: number;
  };
  xpTotal: number;
  gamru: Record<string, unknown> | null;
}

/** The player's money wallet, as returned by /api/wallet. */
export interface Wallet {
  balance: number;
  /** Real Money — deposits + RM-typed bonus claims (balance = realMoney + bonusMoney). */
  realMoney: number;
  /** Bonus Money — BM-typed bonus claims. */
  bonusMoney: number;
  currency: string;
  depositCount: number;
  totalDeposit: number;
}

export interface RecordActivityPayload {
  type: "GAME_PLAY" | "BET_PLACE";
  gameId: string;
  amount: number;
  idempotencyKey: string;
  meta?: Record<string, unknown>;
}

/* ── Reward shop ───────────────────────────────────────────────────────── */

export type ProductCategory = "product" | "booster";
export type BoosterKind = "token" | "xp" | "level" | "mission" | "generic";

export interface BoosterMeta {
  multiplier: number;
  durationMinutes: number;
  kind: BoosterKind;
}

/** A reward-shop product as served by /api/reward-shop/products. */
export interface RewardProduct {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  tokenPrice: number;
  realPrice: number | null;
  currency: string;
  category: ProductCategory;
  categoryLabel: string;
  tier: string | null;
  tags: string[];
  stockAvailable: number | null;
  type: string | null;
  booster: BoosterMeta | null;
  affordable: boolean;
}

export interface RewardShopCatalog extends PaginatedData<RewardProduct> {
  tokens: number;
}

export interface BuyResult {
  tokensRemaining: number;
  tokensSpent: number;
  boosterActivated: boolean;
  purchase: RewardPurchaseRow | null;
}

export interface RewardPurchaseRow {
  id: string;
  productId: string;
  productName: string;
  image: string | null;
  category: ProductCategory;
  tier: string | null;
  tokenCost: number;
  quantity: number;
  multiplier: number | null;
  boosterKind: string | null;
  durationMinutes: number | null;
  expiresAt: string | null;
  status: string;
  createdAt: string;
}

export interface BoosterRow {
  id: string;
  productId: string;
  name: string;
  image: string | null;
  kind: BoosterKind;
  multiplier: number;
  tokenCost: number;
  tier: string | null;
  expiresAt: string | null;
  secondsRemaining: number | null;
  createdAt: string;
}

// ─── Tournaments (sourced from Gamru) ───────────────────────────────────────

export type TournamentState = "SCHEDULED" | "IN_PROGRESS" | "ENDED";

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  industry: string;
  tournament_type: string | null;
  games: string[];
  period: string | null;
  large_image: string | null;
  small_image: string | null;
  min_bet: number | null;
  max_bets: number | null;
  buy_in: number | null;
  start_date: string | null;
  end_date: string | null;
  leaderboard_size: number | null;
  prize_pool: number | null;
  eligibility_type: string | null;
  segment: string | null;
  tags: string[];
  state: TournamentState;
}

export interface TournamentBranding {
  banner_desktop: string | null;
  banner_mobile: string | null;
  tag_color_casino: string;
  tag_color_sport: string;
}

export interface TournamentLeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  score: number;
  is_me: boolean;
  /** Prize-pool share credited to this player once the tournament ended (top-3). */
  prize?: number;
  /** Whether this player already claimed their prize (server-authoritative). */
  claimed?: boolean;
}

export interface TournamentListResult {
  branding: TournamentBranding;
  tournaments: Tournament[];
}

export interface TournamentDetailResult {
  branding: TournamentBranding;
  tournament: Tournament;
  leaderboard: TournamentLeaderboardEntry[];
}

export interface TournamentHistoryGame {
  game: string;
  plays: number;
}

export interface TournamentHistoryEntry {
  tournament_id: string;
  name: string;
  player_name: string;
  player_email: string | null;
  industry: string;
  image: string | null;
  plays: number;
  games_played: TournamentHistoryGame[];
  xp: number;
  rank: number;
  /** Prize GAMRU computed for this player, and whether it has been claimed. */
  prize?: number;
  claimed?: boolean;
  last_played_at: string | null;
}
