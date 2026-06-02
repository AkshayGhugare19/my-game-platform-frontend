import apiService from "@/services/api";
import type {
  ActivityResult,
  ApiResponse,
  BoosterRow,
  BuyResult,
  GamificationProfile,
  PaginatedData,
  RecordActivityPayload,
  RewardPurchaseRow,
  RewardShopCatalog,
  Wallet,
} from "@/types";

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
    products: (): Promise<ApiResponse<RewardShopCatalog>> =>
      apiService.get<RewardShopCatalog>("/reward-shop/products"),
    buy: (
      productId: string,
      quantity = 1
    ): Promise<ApiResponse<BuyResult>> =>
      apiService.post<BuyResult>("/reward-shop/buy", { productId, quantity }),
    boosters: (): Promise<ApiResponse<BoosterRow[]>> =>
      apiService.get<BoosterRow[]>("/reward-shop/boosters"),
    history: (): Promise<ApiResponse<RewardPurchaseRow[]>> =>
      apiService.get<RewardPurchaseRow[]>("/reward-shop/history"),
  },
};

export default endpoints;
