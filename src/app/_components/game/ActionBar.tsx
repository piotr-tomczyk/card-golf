"use client";

import { useTranslations } from "next-intl";

export type TurnState =
  | "idle" // Start of turn, can draw/take from discard/reveal a face-down card
  | "holding_drawn_card" // Drew from deck, need to place or discard
  | "choosing_replacement" // Took from discard, need to choose where to place
  // Power card states
  | "holding_power_card" // Drew a power card — choose ability, place normally, or discard
  | "using_jack" // Select own face-down card to peek
  | "using_queen" // Select opponent's face-down card to peek
  | "using_king_mine" // Select own card to swap
  | "using_king_opponent" // Select opponent's card to swap with
  | "using_joker_first" // Select first opponent position to swap
  | "using_joker_second"; // Select second opponent position to swap

interface ActionBarProps {
  /** Current turn state */
  turnState: TurnState;
  /** Whether it's the player's turn */
  isYourTurn: boolean;
}

export function ActionBar({
  turnState,
  isYourTurn,
}: ActionBarProps) {
  const t = useTranslations("ActionBar");

  if (!isYourTurn) {
    return (
      <p className="text-sm text-green-300 text-center">
        {t("waitingForOpponent")}
      </p>
    );
  }

  if (turnState === "idle") {
    return (
      <div className="flex flex-col items-center text-xs text-green-300 text-center leading-5">
        <span>{t("idleHint1")}</span>
        <span>{t("idleHint2")}</span>
        <span>{t("idleHint3")}</span>
      </div>
    );
  }

  if (turnState === "holding_drawn_card") {
    return (
      <p className="text-sm text-yellow-200 text-center">
        {t("holdingDrawnCard")}
      </p>
    );
  }

  if (turnState === "choosing_replacement") {
    return (
      <p className="text-sm font-semibold text-blue-200 text-center">
        {t("choosingReplacement")}
      </p>
    );
  }

  if (turnState === "holding_power_card") {
    return (
      <p className="text-sm font-semibold text-purple-200 text-center">
        {t("holdingPowerCard")}
      </p>
    );
  }

  if (turnState === "using_jack") {
    return (
      <p className="text-sm text-purple-200 text-center">
        {t("usingJack")}
      </p>
    );
  }

  if (turnState === "using_queen") {
    return (
      <p className="text-sm text-purple-200 text-center">
        {t("usingQueen")}
      </p>
    );
  }

  if (turnState === "using_king_mine") {
    return (
      <p className="text-sm text-purple-200 text-center">
        {t("usingKingMine")}
      </p>
    );
  }

  if (turnState === "using_king_opponent") {
    return (
      <p className="text-sm text-purple-200 text-center">
        {t("usingKingOpponent")}
      </p>
    );
  }

  if (turnState === "using_joker_first") {
    return (
      <p className="text-sm text-purple-200 text-center">
        {t("usingJokerFirst")}
      </p>
    );
  }

  if (turnState === "using_joker_second") {
    return (
      <p className="text-sm text-purple-200 text-center">
        {t("usingJokerSecond")}
      </p>
    );
  }

  return null;
}
