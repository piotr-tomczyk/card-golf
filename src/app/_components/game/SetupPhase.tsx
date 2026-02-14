"use client";

import { useState } from "react";
import { PlayerHand } from "./PlayerHand";
import { api, type RouterOutputs } from "@/trpc/react";

type GameState = RouterOutputs["game"]["getByCode"];

interface SetupPhaseProps {
  game: GameState;
  refetch: () => void;
  userId?: string;
}

export function SetupPhase({ game, refetch, userId }: SetupPhaseProps) {
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
          <p className="text-xl">Unable to identify player</p>
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
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Setup Phase
          </h1>
          <p className="text-xl text-green-200">Round {game.currentRound}</p>
        </div>

        {/* Instructions */}
        {!hasCompletedSetup && (
          <div className="rounded-lg bg-yellow-900/50 border-2 border-yellow-600 p-6 text-center">
            <p className="text-2xl font-bold text-yellow-200">
              Choose 2 cards to reveal
            </p>
            <p className="mt-2 text-yellow-300">
              Click on two face-down cards in your hand, then click Confirm
            </p>
          </div>
        )}

        {hasCompletedSetup && !allPlayersReady && (
          <div className="rounded-lg bg-blue-900/50 border-2 border-blue-600 p-6 text-center">
            <p className="text-2xl font-bold text-blue-200">
              Waiting for opponent...
            </p>
            <p className="mt-2 text-blue-300">
              {opponent?.displayName} is choosing their cards
            </p>
          </div>
        )}

        {allPlayersReady && (
          <div className="rounded-lg bg-green-600 p-6 text-center">
            <p className="text-2xl font-bold">All players ready!</p>
            <p className="mt-2">Starting game...</p>
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
                ✓ Ready
              </p>
            )}
          </div>
        )}

        {/* Current Player Hand (bottom) */}
        <div className="rounded-lg bg-green-900/50 p-6">
          <PlayerHand
            cards={currentPlayer.hand}
            label="Your Hand"
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
                  ? "Confirming..."
                  : `Confirm Selection (${selectedPositions.length}/2)`}
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
            <p className="text-green-300">You</p>
            <p className="mt-1 font-bold">
              {hasCompletedSetup ? "✓ Ready" : "Choosing..."}
            </p>
          </div>
          <div className="rounded-lg bg-green-900/30 p-3">
            <p className="text-green-300">{opponent?.displayName}</p>
            <p className="mt-1 font-bold">
              {opponent?.setupComplete ? "✓ Ready" : "Choosing..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
