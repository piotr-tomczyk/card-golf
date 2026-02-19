"use client";

import { useTranslations } from "next-intl";

interface TurnIndicatorProps {
  /** Current player name */
  currentPlayerName: string;
  /** Whether it's the current user's turn */
  isYourTurn: boolean;
  /** Current turn number */
  turnNumber: number;
  /** Current round number */
  currentRound: number;
  /** Total number of rounds */
  totalRounds: number;
  /** Whether in final turn phase */
  isFinalTurn: boolean;
  /** Optional element rendered at the trailing edge (e.g. a help button) */
  helpButton?: React.ReactNode;
}

export function TurnIndicator({
  currentPlayerName,
  isYourTurn,
  turnNumber,
  currentRound,
  totalRounds,
  isFinalTurn,
  helpButton,
}: TurnIndicatorProps) {
  const t = useTranslations("TurnIndicator");

  if (isFinalTurn) {
    return (
      <div className="overflow-hidden">
        {/* Amber background with subtle stripe pattern */}
        <div
          className="relative bg-amber-500 px-3 py-2 text-center"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.06) 8px, rgba(0,0,0,0.06) 16px)",
          }}
        >
          {/* FINAL TURN label */}
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-900/80">
            {t("finalTurnLabel")}
          </p>

          {/* Who's playing */}
          <p className="mt-0.5 text-base font-bold leading-tight text-white drop-shadow-sm">
            {isYourTurn ? t("yourTurnFinal") : t("opponentTurnFinal", { name: currentPlayerName })}
          </p>

          {/* Round / turn counter */}
          <p className="mt-0.5 text-xs font-semibold text-amber-900/70">
            {t("roundTurnCounter", { current: currentRound, total: totalRounds, turn: turnNumber })}
          </p>

          {/* Help button — top-right, contained within this div */}
          {helpButton && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {helpButton}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg px-4 py-3 ${
        isYourTurn ? "bg-green-600" : "bg-green-900/80"
      }`}
    >
      <div className="flex items-center gap-x-4 gap-y-0.5">
        <span className={`flex-1 text-base font-bold leading-tight text-white ${!isYourTurn ? "text-white/80" : ""}`}>
          {isYourTurn ? t("yourTurn") : t("opponentTurn", { name: currentPlayerName })}
        </span>
        <span className="text-sm text-white/70 shrink-0">
          {t("roundTurnCounter", { current: currentRound, total: totalRounds, turn: turnNumber })}
        </span>
        {helpButton && <div className="shrink-0">{helpButton}</div>}
      </div>
    </div>
  );
}
