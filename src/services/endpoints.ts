import apiService from "@/services/api";
import type {
  ActivityResult,
  ApiResponse,
  BoosterRow,
  BuyResult,
  GamificationProfile,
  LeaderboardData,
  Mission,
  NotificationItem,
  PaginatedData,
  RecordActivityPayload,
  RewardPurchaseRow,
  RewardShopCatalog,
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
    record: (
      payload: RecordActivityPayload
    ): Promise<ApiResponse<ActivityResult>> =>
      apiService.post<ActivityResult>("/activity", payload),
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

  /** /api/missions — the player's missions with progress. */
  missions: {
    list: (
      page = 1,
      limit = 10
    ): Promise<ApiResponse<PaginatedData<Mission>>> =>
      apiService.get<PaginatedData<Mission>>("/missions", { page, limit }),
    claim: (id: string): Promise<ApiResponse<unknown>> =>
      apiService.post(`/missions/${id}/claim`),
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
