"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { PlayerHand } from "./PlayerHand";
import { DrawPile } from "./DrawPile";
import { DiscardPile } from "./DiscardPile";
import { DrawnCardInline } from "./DrawnCardOverlay";
import { TurnIndicator } from "./TurnIndicator";
import { ActionBar, type TurnState } from "./ActionBar";
import { ScoreBoard } from "./ScoreBoard";
import { api, type RouterOutputs } from "@/trpc/react";
import { CARD_VALUES, getRank } from "@/server/game/types";

type GameState = RouterOutputs["game"]["getByCode"];

interface PlayingPhaseProps {
  game: GameState;
  refetch: () => void;
  userId?: string;
}

export function PlayingPhase({ game, refetch, userId }: PlayingPhaseProps) {
  const [turnState, setTurnState] = useState<TurnState>("idle");
  const [isChoosingForDiscard, setIsChoosingForDiscard] = useState(false);
  const [revealPosition, setRevealPosition] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

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
      setTurnState("idle");
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
      setRevealPosition(null);
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

  // Calculate live round score from face-up cards only
  const calcRoundScore = (hand: { card: string | null; faceUp: boolean }[]) => {
    const cols = game.config.gridCols;
    const rows = hand.length / cols;
    let total = 0;

    for (let col = 0; col < cols; col++) {
      const colCards: string[] = [];
      for (let row = 0; row < rows; row++) {
        const slot = hand[row * cols + col];
        if (slot?.faceUp && slot.card) colCards.push(slot.card);
      }
      if (colCards.length === 0) continue;

      const firstRank = getRank(colCards[0]! as Parameters<typeof getRank>[0]);
      const allMatch = colCards.every(
        (c) => getRank(c as Parameters<typeof getRank>[0]) === firstRank,
      );

      if (allMatch && colCards.length > 1) continue;

      for (const c of colCards) {
        const rank = getRank(c as Parameters<typeof getRank>[0]);
        total += CARD_VALUES[rank] ?? 0;
      }
    }
    return total;
  };

  const handleDrawFromDeck = () => {
    drawCard.mutate({ gameId: game.id });
  };

  const handleTakeFromDiscard = () => {
    if (turnState === "idle" && game.discardTop) {
      setIsChoosingForDiscard(true);
      setTurnState("choosing_replacement");
    }
  };

  const handleDiscardCard = () => {
    discardDrawnCard.mutate({ gameId: game.id });
  };

  const handleCancel = () => {
    if (turnState === "choosing_replacement" && isChoosingForDiscard) {
      setIsChoosingForDiscard(false);
      setTurnState("idle");
    }
  };

  const handleCardClick = (position: number) => {
    // Holding drawn card — clicking a hand position places the card
    if (turnState === "holding_drawn_card") {
      placeDrawnCard.mutate({ gameId: game.id, position });
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

    // Idle - clicking a face-down card to reveal it (standalone action)
    if (turnState === "idle" && isYourTurn) {
      const card = currentPlayer.hand[position];
      if (card && !card.faceUp) {
        setRevealPosition(position);
      }
      return;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || isPending) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (overData?.type === "hand-position") {
      const position = overData.position as number;
      if (activeData?.type === "drawn-card" && turnState === "holding_drawn_card") {
        placeDrawnCard.mutate({ gameId: game.id, position });
      } else if (activeData?.type === "discard-card" && turnState === "idle") {
        takeDiscardAndReplace.mutate({ gameId: game.id, position });
      }
    } else if (overData?.type === "discard-zone") {
      if (activeData?.type === "drawn-card" && turnState === "holding_drawn_card") {
        discardDrawnCard.mutate({ gameId: game.id });
      }
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

  // Hand positions are droppable when holding a drawn card, choosing replacement,
  // or idle with a discard card available (for drag from discard pile)
  const droppablePositions =
    turnState === "holding_drawn_card" || turnState === "choosing_replacement"
      ? currentPlayer.hand.map((_, i) => i)
      : turnState === "idle" && isYourTurn && topDiscard
        ? currentPlayer.hand.map((_, i) => i)
        : [];

  // Hand positions are selectable when holding drawn card, choosing replacement,
  // or idle (for face-down card reveal)
  const selectablePositions =
    turnState === "holding_drawn_card" || turnState === "choosing_replacement"
      ? currentPlayer.hand.map((_, i) => i)
      : turnState === "idle" && isYourTurn
        ? currentPlayer.hand
            .map((_, i) => i)
            .filter((i) => !currentPlayer.hand[i]?.faceUp)
        : [];

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-800 to-green-950 px-2 py-2 text-white md:px-6 md:py-4">
        <div className="mx-auto w-full space-y-3">
          {/* Turn Indicator - sticky at top */}
          <TurnIndicator
            currentPlayerName={currentTurnPlayer.displayName}
            isYourTurn={isYourTurn}
            turnNumber={game.turnNumber}
            currentRound={game.currentRound}
            totalRounds={totalRounds}
            isFinalTurn={game.status === "final_turn"}
          />

          {/* Main game area: side-by-side on desktop, stacked on mobile */}
          <div className="md:grid md:grid-cols-[1fr_1fr] md:gap-6 md:flex-1">
            {/* Left column: hands */}
            <div className="flex flex-col justify-center space-y-4">
              {/* Opponent Hand */}
              {opponent && (
                <div className="rounded-lg bg-green-900/30 p-3 md:p-4">
                  <PlayerHand
                    cards={opponent.hand}
                    label={`${opponent.displayName} (${calcRoundScore(opponent.hand)} pts)`}
                    isCurrentPlayer={false}
                    size="md"
                  />
                </div>
              )}

              {/* Current Player Hand */}
              <div className="rounded-lg bg-green-900/50 p-3 md:p-4">
                <PlayerHand
                  cards={currentPlayer.hand}
                  label={`Your Hand (${calcRoundScore(currentPlayer.hand)} pts)`}
                  isCurrentPlayer={true}
                  onCardClick={handleCardClick}
                  selectablePositions={selectablePositions}
                  droppablePositions={droppablePositions}
                  size="lg"
                />
              </div>
            </div>

            {/* Right column: piles + drawn card + actions */}
            <div className="mt-3 md:mt-0 flex flex-col justify-center space-y-3">
              {/* Piles */}
              <div className="flex items-start justify-center gap-6 rounded-lg bg-green-900/30 p-4 md:p-6">
                <DrawPile
                  count={game.deckCount}
                  selectable={isYourTurn && turnState === "idle" && game.deckCount > 0}
                  onClick={handleDrawFromDeck}
                  size="lg"
                />
                <DiscardPile
                  topCard={topDiscard}
                  selectable={isYourTurn && turnState === "idle" && topDiscard !== null}
                  onClick={handleTakeFromDiscard}
                  size="lg"
                />
              </div>

              {/* Drawn Card Inline */}
              {turnState === "holding_drawn_card" && game.drawnCard && (
                <DrawnCardInline
                  card={game.drawnCard}
                  onDiscard={handleDiscardCard}
                  disabled={isPending}
                />
              )}

              {/* Cancel button for discard pile selection */}
              {turnState === "choosing_replacement" && isChoosingForDiscard && (
                <div className="flex justify-center">
                  <button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Action Bar */}
              <ActionBar
                turnState={turnState}
                isYourTurn={isYourTurn}
                deckEmpty={game.deckCount === 0}
                discardEmpty={!topDiscard}
                onDrawFromDeck={handleDrawFromDeck}
                isPending={isPending}
              />
            </div>
          </div>

          {/* ScoreBoard */}
          <ScoreBoard game={game} />

          {/* Error Display */}
          {(drawCard.error ||
            takeDiscardAndReplace.error ||
            placeDrawnCard.error ||
            discardDrawnCard.error ||
            uncoverCard.error) && (
            <div className="rounded-lg bg-red-900/50 border-2 border-red-600 p-3 text-center">
              <p className="text-sm text-red-200">
                {drawCard.error?.message ||
                  takeDiscardAndReplace.error?.message ||
                  placeDrawnCard.error?.message ||
                  discardDrawnCard.error?.message ||
                  uncoverCard.error?.message}
              </p>
            </div>
          )}
        </div>

        {/* Reveal Card Confirmation */}
        {revealPosition !== null && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-xl bg-green-900 p-6 shadow-2xl border border-green-600">
              <h3 className="text-xl font-bold text-white text-center">
                Reveal this card?
              </h3>
              <p className="mt-2 text-sm text-green-300 text-center">
                This will use your turn to flip this card face up.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setRevealPosition(null)}
                  className="flex-1 rounded-lg bg-green-800 px-4 py-3 font-semibold text-green-200 transition hover:bg-green-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    uncoverCard.mutate({ gameId: game.id, position: revealPosition });
                    setRevealPosition(null);
                  }}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-green-500 px-4 py-3 font-semibold text-white transition hover:bg-green-400 disabled:opacity-50"
                >
                  Reveal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
