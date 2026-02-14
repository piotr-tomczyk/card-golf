"use client";

import { useState, useEffect } from "react";
import { PlayerHand } from "./PlayerHand";
import { DrawPile } from "./DrawPile";
import { DiscardPile } from "./DiscardPile";
import { DrawnCardOverlay } from "./DrawnCardOverlay";
import { TurnIndicator } from "./TurnIndicator";
import { ActionBar, type TurnState } from "./ActionBar";
import { ScoreBoard } from "./ScoreBoard";
import { api, type RouterOutputs } from "@/trpc/react";

type GameState = RouterOutputs["game"]["getByCode"];

interface PlayingPhaseProps {
  game: GameState;
  refetch: () => void;
  userId?: string;
}

export function PlayingPhase({ game, refetch, userId }: PlayingPhaseProps) {
  const [turnState, setTurnState] = useState<TurnState>("idle");
  const [isChoosingForDiscard, setIsChoosingForDiscard] = useState(false);

  const drawCard = api.game.drawCard.useMutation({
    onSuccess: () => {
      setTurnState("holding_drawn_card");
      refetch();
    },
  });

  const takeDiscardAndReplace = api.game.takeDiscardAndReplace.useMutation({
    onSuccess: () => {
      setTurnState("idle");
      setIsChoosingForDiscard(false);
      refetch();
    },
  });

  const placeDrawnCard = api.game.placeDrawnCard.useMutation({
    onSuccess: () => {
      setTurnState("idle");
      refetch();
    },
  });

  const discardDrawnCard = api.game.discardDrawnCard.useMutation({
    onSuccess: () => {
      setTurnState("after_discard");
      refetch();
    },
  });

  const uncoverCard = api.game.uncoverCard.useMutation({
    onSuccess: () => {
      setTurnState("idle");
      refetch();
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
  const currentTurnPlayer = game.players[game.currentPlayerIndex];
  const isYourTurn = currentPlayer?.id === currentTurnPlayer?.id;

  // Reset turn state when turn changes
  useEffect(() => {
    if (!isYourTurn) {
      setTurnState("idle");
      setIsChoosingForDiscard(false);
    }
  }, [isYourTurn, game.turnNumber]);

  if (!currentPlayer || !currentTurnPlayer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-800 to-green-950 text-white">
        <div className="text-center">
          <p className="text-xl">Unable to identify players</p>
        </div>
      </div>
    );
  }

  const opponent = game.players.find((p) => p.id !== currentPlayer.id);

  const handleDrawFromDeck = () => {
    drawCard.mutate({ gameId: game.id });
  };

  const handleTakeFromDiscard = () => {
    if (turnState === "idle" && game.discardTop) {
      setIsChoosingForDiscard(true);
      setTurnState("choosing_replacement");
    }
  };

  const handlePlaceCard = () => {
    setTurnState("choosing_replacement");
  };

  const handleDiscardCard = () => {
    discardDrawnCard.mutate({ gameId: game.id });
  };

  const handleCardClick = (position: number) => {
    // After discard - uncover a face-down card
    if (turnState === "after_discard") {
      const card = currentPlayer.hand[position];
      if (card && !card.faceUp) {
        uncoverCard.mutate({ gameId: game.id, position });
      }
      return;
    }

    // Choosing replacement - place card
    if (turnState === "choosing_replacement") {
      if (isChoosingForDiscard) {
        // Taking from discard pile
        takeDiscardAndReplace.mutate({ gameId: game.id, position });
      } else {
        // Placing drawn card
        placeDrawnCard.mutate({ gameId: game.id, position });
      }
      return;
    }
  };

  const topDiscard = game.discardTop ?? null;

  const totalRounds = game.config.totalRounds;
  const isPending =
    drawCard.isPending ||
    takeDiscardAndReplace.isPending ||
    placeDrawnCard.isPending ||
    discardDrawnCard.isPending ||
    uncoverCard.isPending;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-800 to-green-950 px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Turn Indicator */}
        <TurnIndicator
          currentPlayerName={currentTurnPlayer.displayName}
          isYourTurn={isYourTurn}
          turnNumber={game.turnNumber}
          currentRound={game.currentRound}
          totalRounds={totalRounds}
          isFinalTurn={game.status === "final_turn"}
        />

        {/* Opponent Hand */}
        {opponent && (
          <div className="rounded-lg bg-green-900/30 p-4">
            <PlayerHand
              cards={opponent.hand}
              label={`${opponent.displayName} (${opponent.totalScore} pts)`}
              isCurrentPlayer={false}
              size="sm"
            />
          </div>
        )}

        {/* Center Area - Piles */}
        <div className="flex items-center justify-center gap-8 rounded-lg bg-green-900/30 p-8">
          <DrawPile
            count={game.deckCount}
            selectable={isYourTurn && turnState === "idle" && game.deckCount > 0}
            onClick={handleDrawFromDeck}
          />

          <DiscardPile
            topCard={topDiscard}
            selectable={isYourTurn && turnState === "idle" && topDiscard !== null}
            onClick={handleTakeFromDiscard}
          />
        </div>

        {/* Current Player Hand */}
        <div className="rounded-lg bg-green-900/50 p-4">
          <PlayerHand
            cards={currentPlayer.hand}
            label={`Your Hand (${currentPlayer.totalScore} pts)`}
            isCurrentPlayer={true}
            onCardClick={handleCardClick}
            selectablePositions={
              turnState === "after_discard"
                ? currentPlayer.hand
                    .map((_, i) => i)
                    .filter((i) => !currentPlayer.hand[i]?.faceUp)
                : turnState === "choosing_replacement"
                  ? currentPlayer.hand.map((_, i) => i)
                  : []
            }
            size="md"
          />
        </div>

        {/* Action Bar */}
        <ActionBar
          turnState={turnState}
          isYourTurn={isYourTurn}
          deckEmpty={game.deckCount === 0}
          discardEmpty={!topDiscard}
          onDrawFromDeck={handleDrawFromDeck}
          isPending={isPending}
        />

        {/* ScoreBoard */}
        <ScoreBoard game={game} />

        {/* Error Display */}
        {(drawCard.error ||
          takeDiscardAndReplace.error ||
          placeDrawnCard.error ||
          discardDrawnCard.error ||
          uncoverCard.error) && (
          <div className="rounded-lg bg-red-900/50 border-2 border-red-600 p-4 text-center">
            <p className="text-red-200">
              {drawCard.error?.message ||
                takeDiscardAndReplace.error?.message ||
                placeDrawnCard.error?.message ||
                discardDrawnCard.error?.message ||
                uncoverCard.error?.message}
            </p>
          </div>
        )}
      </div>

      {/* Drawn Card Overlay */}
      {turnState === "holding_drawn_card" && game.drawnCard && (
        <DrawnCardOverlay
          card={game.drawnCard}
          onPlace={handlePlaceCard}
          onDiscard={handleDiscardCard}
          disabled={isPending}
        />
      )}
    </div>
  );
}
