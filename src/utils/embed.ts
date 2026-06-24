/**
 * Widget-embed mode. When a game page is loaded INSIDE a GAMRU widget iframe
 * (`?embed=widget`), it must run without the games-platform session and must
 * NOT call the games backend — instead it reports each play to the parent
 * widget via postMessage, and the widget relays it to GAMRU's clientAuth API.
 * This keeps the real games reusable while routing progression through the
 * "Widget APIs" (see BONUS/widget flow). Detection is by URL so it works in any
 * game page without prop drilling.
 */

export const isWidgetEmbed = (): boolean => {
  try {
    return new URLSearchParams(window.location.search).get("embed") === "widget";
  } catch {
    return false;
  }
};

/** The play signal a game emits to its parent widget in embed mode. */
export interface WidgetPlaySignal {
  kind: "play";
  gameKey: string | null;
  stake: number;
  win: boolean;
  winAmount: number;
  /** XP the game computed for this play (used for XP parity in the widget). */
  amount: number;
  /** Tournament points for this play (mirrors the Mission-tab scoring). */
  points: number;
  /** Mission / bundle / tournament context, read from the game URL. */
  mission?: string | null;
  bundle?: string | null;
  tournament?: string | null;
}

/** Post a play to the parent widget (GAMRU origin). Best-effort; never throws. */
export const postPlayToParent = (signal: WidgetPlaySignal): void => {
  try {
    window.parent?.postMessage({ source: "gamru-game", ...signal }, "*");
  } catch {
    /* sandboxed / no parent — ignore */
  }
};
