"use client";

import { useTranslations } from "next-intl";

export type TurnState =
  | "idle" // Start of turn, can draw/take from discard/reveal a face-down card
  | "holding_drawn_card" // Drew from deck, need to place or discard
  | "choosing_replacement"; // Took from discard, need to choose where to place

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

  return null;
}
