"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlayerHand } from "./PlayerHand";
import { HowToPlay } from "@/app/_components/HowToPlay";
import { api, type RouterOutputs } from "@/trpc/react";

type GameState = RouterOutputs["game"]["getByCode"];

interface SetupPhaseProps {
  game: GameState;
  refetch: () => void;
  userId?: string;
}

export function SetupPhase({ game, refetch, userId }: SetupPhaseProps) {
  const t = useTranslations("SetupPhase");
  const [selectedPositions, setSelectedPositions] = useState<number[]>([]);

  const revealInitialCards = api.game.revealInitialCards.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedPositions([]);
    },
  });

  // Get current player info
  const getCurrentPlayer = () => {
    if (typeof window === "undefined") return null;

    const guestId = localStorage.getItem("guestId");

    // For authenticated users, match by userId
    if (userId) {
      return game.players.find((p) => !p.isGuest && p.userId === userId);
    }

    // For guests, match by guestId (backend adds "guest_" prefix)
    if (guestId) {
      return game.players.find((p) => p.isGuest && p.userId === `guest_${guestId}`);
    }

    return null;
  };

  const currentPlayer = getCurrentPlayer();

  if (!currentPlayer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-800 to-green-950 text-white">
        <div className="text-center">
          <p className="text-xl">{t("unableToIdentify")}</p>
        </div>
      </div>
    );
  }

  const hasCompletedSetup = currentPlayer.setupComplete;
  const allPlayersReady = game.players.every((p) => p.setupComplete);

  const handleCardClick = (position: number) => {
    if (hasCompletedSetup) return;

    setSelectedPositions((prev) => {
      if (prev.includes(position)) {
        // Deselect
        return prev.filter((p) => p !== position);
      } else if (prev.length < 2) {
        // Select (max 2)
        return [...prev, position];
      } else {
        // Replace oldest selection
        return [prev[1]!, position];
      }
    });
  };

  const handleConfirm = () => {
    if (selectedPositions.length === 2) {
      revealInitialCards.mutate({
        gameId: game.id,
        positions: selectedPositions,
      });
    }
  };

  // Get opponent info
  const opponent = game.players.find((p) => p.id !== currentPlayer.id);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-800 to-green-950 px-4 py-8 text-white">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="relative text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t("setupPhase")}
          </h1>
          <p className="text-xl text-green-200">{t("round", { n: game.currentRound })}</p>
          <div className="absolute top-0 right-0">
            <HowToPlay compact />
          </div>
        </div>

        {/* Instructions */}
        {!hasCompletedSetup && (
          <div className="rounded-lg bg-yellow-900/50 border-2 border-yellow-600 p-6 text-center">
            <p className="text-2xl font-bold text-yellow-200">
              {t("choose2Cards")}
            </p>
            <p className="mt-2 text-yellow-300">
              {t("clickTwoCards")}
            </p>
          </div>
        )}

        {hasCompletedSetup && !allPlayersReady && (
          <div className="rounded-lg bg-blue-900/50 border-2 border-blue-600 p-6 text-center">
            <p className="text-2xl font-bold text-blue-200">
              {t("waitingForOpponent")}
            </p>
            <p className="mt-2 text-blue-300">
              {t("opponentChoosing", { name: opponent?.displayName ?? "" })}
            </p>
          </div>
        )}

        {allPlayersReady && (
          <div className="rounded-lg bg-green-600 p-6 text-center">
            <p className="text-2xl font-bold">{t("allPlayersReady")}</p>
            <p className="mt-2">{t("startingGame")}</p>
          </div>
        )}

        {/* Opponent Hand (top) */}
        {opponent && (
          <div className="rounded-lg bg-green-900/30 p-6">
            <PlayerHand
              cards={opponent.hand}
              label={opponent.displayName}
              isCurrentPlayer={false}
              size="sm"
            />
            {opponent.setupComplete && (
              <p className="mt-3 text-center text-sm text-green-400">
                {t("ready")}
              </p>
            )}
          </div>
        )}

        {/* Current Player Hand (bottom) */}
        <div className="rounded-lg bg-green-900/50 p-6">
          <PlayerHand
            cards={currentPlayer.hand}
            label={t("youLabel") + " – " + (hasCompletedSetup ? t("ready") : t("choosing"))}
            isCurrentPlayer={true}
            onCardClick={handleCardClick}
            selectablePositions={
              hasCompletedSetup
                ? []
                : currentPlayer.hand
                    .map((_, i) => i)
                    .filter((i) => !currentPlayer.hand[i]?.faceUp)
            }
            selectedPositions={selectedPositions}
            size="md"
          />

          {/* Confirm Button */}
          {!hasCompletedSetup && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleConfirm}
                disabled={
                  selectedPositions.length !== 2 || revealInitialCards.isPending
                }
                className="rounded-lg bg-green-600 px-8 py-4 text-xl font-semibold text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {revealInitialCards.isPending
                  ? t("confirming")
                  : t("confirmSelection", { count: selectedPositions.length })}
              </button>
            </div>
          )}

          {revealInitialCards.error && (
            <p className="mt-4 text-center text-sm text-red-400">
              {revealInitialCards.error.message}
            </p>
          )}
        </div>

        {/* Player Status */}
        <div className="grid grid-cols-2 gap-4 text-center text-sm">
          <div className="rounded-lg bg-green-900/30 p-3">
            <p className="text-green-300">{t("youLabel")}</p>
            <p className="mt-1 font-bold">
              {hasCompletedSetup ? t("ready") : t("choosing")}
            </p>
          </div>
          <div className="rounded-lg bg-green-900/30 p-3">
            <p className="text-green-300">{opponent?.displayName}</p>
            <p className="mt-1 font-bold">
              {opponent?.setupComplete ? t("ready") : t("choosing")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
