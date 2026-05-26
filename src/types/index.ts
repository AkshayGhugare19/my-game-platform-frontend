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

export interface Mission {
  id: string;
  code: string;
  title: string;
  description: string;
  type: string;
  metric: string;
  target: number;
  reward_xp: number;
  reward_coins: number;
  progress: number;
  status: "LOCKED" | "IN_PROGRESS" | "COMPLETED" | "CLAIMED" | "EXPIRED";
}

export interface UserReward {
  id: string;
  reward_id: string;
  source: string;
  status: string;
  granted_at: string;
  expires_at: string | null;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  score: number;
  name?: string;
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

export interface RecordActivityPayload {
  type: "GAME_PLAY" | "BET_PLACE";
  gameId: string;
  amount: number;
  idempotencyKey: string;
  meta?: Record<string, unknown>;
}
