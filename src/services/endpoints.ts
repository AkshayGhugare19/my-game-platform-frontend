import apiService from "@/services/api";
import type {
  ActivityResult,
  ApiResponse,
  BoosterRow,
  BuyResult,
  GamificationProfile,
  LeaderboardData,
  Mission,
  MissionListResult,
  MissionBundle,
  MissionBundleListResult,
  NotificationItem,
  PaginatedData,
  RecordActivityPayload,
  RewardPurchaseRow,
  RewardShopCatalog,
  TournamentDetailResult,
  TournamentHistoryEntry,
  TournamentListResult,
  UserReward,
  Wallet,
} from "@/types";

type Board = "global" | "weekly" | "monthly";

/**
 * Centralised, typed API surface — one place that knows the route shapes,
 * so pages depend on `endpoints.profile.get()` instead of raw URL strings.
 * Mirrors the backend's hamaraEngageService structure on the client side.
 */

export interface XpHistoryRow {
  id: string;
  source: string;
  rule_code: string | null;
  xp_amount: number;
  balance_after: number;
  created_at: string;
}

const endpoints = {
  /** /api/profile — gamification profile sourced from Hamara Engage. */
  profile: {
    get: (): Promise<ApiResponse<GamificationProfile>> =>
      apiService.get<GamificationProfile>("/profile"),
    xpHistory: (
      page = 1,
      limit = 15
    ): Promise<ApiResponse<PaginatedData<XpHistoryRow>>> =>
      apiService.get<PaginatedData<XpHistoryRow>>("/profile/xp/history", {
        page,
        limit,
      }),
  },

  /** /api/wallet — player money wallet (deposit funds, view balance). */
  wallet: {
    get: (): Promise<ApiResponse<Wallet>> =>
      apiService.get<Wallet>("/wallet"),
    deposit: (amount: number): Promise<ApiResponse<Wallet>> =>
      apiService.post<Wallet>("/wallet/deposit", { amount }),
  },

  /** /api/activity — record a gameplay / bet event (XP rewards participation). */
  activity: {
    record: async (
      payload: RecordActivityPayload
    ): Promise<ApiResponse<ActivityResult>> => {
      const res = await apiService.post<ActivityResult>("/activity", payload);
      // When a game is launched from a tournament (`?tournament=<id>` in the
      // URL), mirror the points earned to that tournament's leaderboard.
      // Best-effort: never let scoring break the play result.
      try {
        const tid = new URLSearchParams(window.location.search).get(
          "tournament"
        );
        if (tid && res?.success) {
          const game =
            typeof payload.meta?.game === "string" ? payload.meta.game : null;
          const points = Math.max(0, Math.round(Number(payload.amount) || 0));
          if (points > 0) {
            await apiService.post(`/tournaments/${tid}/score`, {
              points,
              game,
            });
          }
        }
      } catch {
        /* tournament scoring is best-effort */
      }
      return res;
    },
  },

  /**
   * /api/reward-shop — browse reward products sourced from gamru, spend
   * tokens to buy them, and view the player's boosters + purchase history.
   */
  rewardShop: {
    products: (page = 1, limit = 12): Promise<ApiResponse<RewardShopCatalog>> =>
      apiService.get<RewardShopCatalog>("/reward-shop/products", { page, limit }),
    buy: (
      productId: string,
      quantity = 1
    ): Promise<ApiResponse<BuyResult>> =>
      apiService.post<BuyResult>("/reward-shop/buy", { productId, quantity }),
    boosters: (
      page = 1,
      limit = 12
    ): Promise<ApiResponse<PaginatedData<BoosterRow>>> =>
      apiService.get<PaginatedData<BoosterRow>>("/reward-shop/boosters", {
        page,
        limit,
      }),
    history: (
      page = 1,
      limit = 10
    ): Promise<ApiResponse<PaginatedData<RewardPurchaseRow>>> =>
      apiService.get<PaginatedData<RewardPurchaseRow>>("/reward-shop/history", {
        page,
        limit,
      }),
  },

  /** /api/rewards — the player's earned rewards (gamru-sourced). */
  rewards: {
    list: (
      page = 1,
      limit = 10,
      status?: string
    ): Promise<ApiResponse<PaginatedData<UserReward>>> =>
      apiService.get<PaginatedData<UserReward>>("/rewards", {
        page,
        limit,
        status,
      }),
    claim: (id: string): Promise<ApiResponse<unknown>> =>
      apiService.post(`/rewards/${id}/claim`),
  },

  /**
   * /api/missions — Gamru-authored missions the player can join, progress and
   * claim. The catalog is fetched live from gamru with the player's
   * participation merged in.
   */
  missions: {
    list: (): Promise<ApiResponse<MissionListResult>> =>
      apiService.get<MissionListResult>("/missions"),
    get: (id: string): Promise<ApiResponse<Mission>> =>
      apiService.get<Mission>(`/missions/${id}`),
    join: (id: string): Promise<ApiResponse<Mission>> =>
      apiService.post<Mission>(`/missions/${id}/join`),
    claim: (id: string): Promise<ApiResponse<{ reward_label: string }>> =>
      apiService.post(`/missions/${id}/claim`),
    cancel: (id: string): Promise<ApiResponse<unknown>> =>
      apiService.post(`/missions/${id}/cancel`),
  },

  /**
   * /api/mission-bundles — Gamru-authored bundles that GROUP missions. Read
   * only: each bundle's grouped missions are joined/claimed through the
   * /missions endpoints above.
   */
  missionBundles: {
    list: (): Promise<ApiResponse<MissionBundleListResult>> =>
      apiService.get<MissionBundleListResult>("/mission-bundles"),
    get: (id: string): Promise<ApiResponse<MissionBundle>> =>
      apiService.get<MissionBundle>(`/mission-bundles/${id}`),
  },

  /** /api/tournaments — Gamru-authored tournaments the player can join. */
  tournaments: {
    list: (): Promise<ApiResponse<TournamentListResult>> =>
      apiService.get<TournamentListResult>("/tournaments"),
    get: (id: string): Promise<ApiResponse<TournamentDetailResult>> =>
      apiService.get<TournamentDetailResult>(`/tournaments/${id}`),
    history: (): Promise<ApiResponse<TournamentHistoryEntry[]>> =>
      apiService.get<TournamentHistoryEntry[]>("/tournaments/history"),
    score: (
      id: string,
      points: number,
      game?: string | null
    ): Promise<ApiResponse<{ tournament_id: string; score: number; applied: number }>> =>
      apiService.post(`/tournaments/${id}/score`, { points, game }),
  },

  /** /api/leaderboard — global / weekly / monthly boards. */
  leaderboard: {
    board: (
      board: Board,
      page = 1,
      limit = 20
    ): Promise<ApiResponse<LeaderboardData>> =>
      apiService.get<LeaderboardData>(`/leaderboard/${board}`, { page, limit }),
  },

  /** /api/notifications — the player's notification feed. */
  notifications: {
    list: (
      page = 1,
      limit = 20
    ): Promise<ApiResponse<PaginatedData<NotificationItem>>> =>
      apiService.get<PaginatedData<NotificationItem>>("/notifications", {
        page,
        limit,
      }),
    markAllRead: (): Promise<ApiResponse<unknown>> =>
      apiService.patch("/notifications/read-all"),
  },
};

export default endpoints;
