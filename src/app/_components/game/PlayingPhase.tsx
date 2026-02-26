"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { Card } from "./Card";
import { TurnIndicator } from "./TurnIndicator";
import { ActionBar, type TurnState } from "./ActionBar";
import { ScoreBoard } from "./ScoreBoard";
import { ScoreStrip } from "./ScoreStrip";
import { HowToPlay } from "@/app/_components/HowToPlay";
import { api, type RouterOutputs } from "@/trpc/react";
import { CARD_VALUES, getRank, isPowerCard, type Card as CardType, type Rank } from "@/server/game/types";
import { getMatchedLineTypes, calcSquareBonuses, calcJokerScore } from "@/server/game/scoring";

type GameState = RouterOutputs["game"]["getByCode"];

interface PlayingPhaseProps {
  game: GameState;
  refetch: () => void;
  userId?: string;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export function PlayingPhase({ game, refetch, userId }: PlayingPhaseProps) {
  const t = useTranslations("PlayingPhase");
  const isDesktop = useIsDesktop();
  const [turnState, setTurnState] = useState<TurnState>("idle");
  const [isChoosingForDiscard, setIsChoosingForDiscard] = useState(false);
  const [revealPosition, setRevealPosition] = useState<number | null>(null);
  const [kingMyPosition, setKingMyPosition] = useState<number | null>(null);
  const [jokerFirstPosition, setJokerFirstPosition] = useState<number | null>(null);
  const [peekedCard, setPeekedCard] = useState<CardType | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const drawCard = api.game.drawCard.useMutation({
    onSuccess: (data) => {
      if (data.config.specialAbilities && data.drawnCard && isPowerCard(data.drawnCard)) {
        setTurnState("holding_power_card");
      } else {
        setTurnState("holding_drawn_card");
      }
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

  const jackAbilityMutation = api.game.useJackAbility.useMutation({
    onSuccess: (data) => {
      setPeekedCard(data.peekedCard);
      setTurnState("idle");
      refetch();
    },
  });

  const queenAbilityMutation = api.game.useQueenAbility.useMutation({
    onSuccess: (data) => {
      setPeekedCard(data.peekedCard);
      setTurnState("idle");
      refetch();
    },
  });

  const kingAbilityMutation = api.game.useKingAbility.useMutation({
    onSuccess: () => {
      setKingMyPosition(null);
      setTurnState("idle");
      refetch();
    },
  });

  const jokerAbilityMutation = api.game.useJokerAbility.useMutation({
    onSuccess: () => {
      setJokerFirstPosition(null);
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
      setKingMyPosition(null);
      setJokerFirstPosition(null);
    }
  }, [isYourTurn, game.turnNumber]);

  if (!currentPlayer || !currentTurnPlayer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-800 to-green-950 text-white">
        <div className="text-center">
          <p className="text-xl">{t("unableToIdentify")}</p>
        </div>
      </div>
    );
  }

  const opponent = game.players.find((p) => p.id !== currentPlayer.id);

  // Find positions that form a matching line (same rank, all face-up)
  const getMatchedPositions = (hand: { card: string | null; faceUp: boolean }[]) =>
    getMatchedLineTypes(hand, game.config.gridCols);

  // Calculate live round score from face-up cards only
  const calcRoundScore = (hand: { card: string | null; faceUp: boolean }[]) => {
    const matchedPos = getMatchedLineTypes(hand, game.config.gridCols);
    let total = 0;
    let jokerCount = 0;
    for (let i = 0; i < hand.length; i++) {
      const slot = hand[i];
      if (!slot?.faceUp || !slot.card) continue;
      if (slot.card.startsWith("*")) {
        jokerCount++;
        continue; // Scored separately below
      }
      if (!matchedPos[i]) {
        total += CARD_VALUES[slot.card[0] as Rank] ?? 0;
      }
      // square and line positions: 0 individually
    }
    // Add −(rank value) once per matched square group
    total += calcSquareBonuses(hand, game.config.gridCols);
    // Jokers: configured single / pair scores
    total += calcJokerScore(jokerCount, game.config.jokerSingleScore ?? 15, game.config.jokerPairScore ?? -5);
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

  const handleCancelAbility = () => {
    setKingMyPosition(null);
    setJokerFirstPosition(null);
    setTurnState("holding_power_card");
  };

  // Determine ability label for the drawn power card
  const getAbilityLabel = () => {
    if (!game.drawnCard) return t("useAbility");
    const rank = getRank(game.drawnCard);
    if (rank === "J") return t("jackAbility");
    if (rank === "Q") return t("queenAbility");
    if (rank === "K") return t("kingAbility");
    if (rank === "*") return t("jokerAbility");
    return t("useAbility");
  };

  const handleUseAbility = () => {
    if (!game.drawnCard) return;
    const rank = getRank(game.drawnCard);
    if (rank === "J") setTurnState("using_jack");
    else if (rank === "Q") setTurnState("using_queen");
    else if (rank === "K") setTurnState("using_king_mine");
    else if (rank === "*") setTurnState("using_joker_first");
  };

  const handleCardClick = (position: number) => {
    // Power ability states for own cards
    if (turnState === "using_jack") {
      jackAbilityMutation.mutate({ gameId: game.id, position });
      return;
    }

    if (turnState === "using_king_mine") {
      setKingMyPosition(position);
      setTurnState("using_king_opponent");
      return;
    }

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

  const handleOpponentCardClick = (position: number) => {
    if (!opponent) return;

    if (turnState === "using_queen") {
      queenAbilityMutation.mutate({ gameId: game.id, opponentId: opponent.id, position });
      return;
    }

    if (turnState === "using_king_opponent" && kingMyPosition !== null) {
      kingAbilityMutation.mutate({
        gameId: game.id,
        myPosition: kingMyPosition,
        opponentId: opponent.id,
        opponentPosition: position,
      });
      return;
    }

    if (turnState === "using_joker_first") {
      setJokerFirstPosition(position);
      setTurnState("using_joker_second");
      return;
    }

    if (turnState === "using_joker_second" && jokerFirstPosition !== null) {
      jokerAbilityMutation.mutate({
        gameId: game.id,
        opponentId: opponent.id,
        pos1: jokerFirstPosition,
        pos2: position,
      });
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
    uncoverCard.isPending ||
    jackAbilityMutation.isPending ||
    queenAbilityMutation.isPending ||
    kingAbilityMutation.isPending ||
    jokerAbilityMutation.isPending;

  // Hand positions are droppable when holding a drawn card, choosing replacement,
  // or idle with a discard card available (for drag from discard pile)
  const droppablePositions =
    turnState === "holding_drawn_card" || turnState === "choosing_replacement"
      ? currentPlayer.hand.map((_, i) => i)
      : turnState === "idle" && isYourTurn && topDiscard
        ? currentPlayer.hand.map((_, i) => i)
        : [];

  // Own hand selectable positions
  const selectablePositions = (() => {
    if (turnState === "holding_drawn_card" || turnState === "choosing_replacement") {
      return currentPlayer.hand.map((_, i) => i);
    }
    if (turnState === "using_jack") {
      return currentPlayer.hand.map((_, i) => i).filter((i) => !currentPlayer.hand[i]?.faceUp);
    }
    if (turnState === "using_king_mine") {
      return currentPlayer.hand.map((_, i) => i);
    }
    if (turnState === "idle" && isYourTurn) {
      return currentPlayer.hand.map((_, i) => i).filter((i) => !currentPlayer.hand[i]?.faceUp);
    }
    return [];
  })();

  // Opponent hand selectable positions
  const opponentSelectablePositions = (() => {
    if (!opponent) return [];
    if (turnState === "using_queen") {
      return opponent.hand.map((_, i) => i).filter((i) => !opponent.hand[i]?.faceUp);
    }
    if (turnState === "using_king_opponent") {
      return opponent.hand.map((_, i) => i);
    }
    if (turnState === "using_joker_first") {
      return opponent.hand.map((_, i) => i);
    }
    if (turnState === "using_joker_second") {
      return opponent.hand.map((_, i) => i).filter((i) => i !== jokerFirstPosition);
    }
    return [];
  })();

  const isAbilityState =
    turnState === "using_jack" ||
    turnState === "using_queen" ||
    turnState === "using_king_mine" ||
    turnState === "using_king_opponent" ||
    turnState === "using_joker_first" ||
    turnState === "using_joker_second";

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-800 to-green-950 px-2 py-2 text-white md:px-4 md:py-3 md:h-screen md:overflow-hidden">
          {/* Sticky header: turn indicator + mobile score strip */}
          <div className="sticky top-0 z-10 flex flex-col gap-0">
            <TurnIndicator
              currentPlayerName={currentTurnPlayer.displayName}
              isYourTurn={isYourTurn}
              turnNumber={game.turnNumber}
              currentRound={game.currentRound}
              totalRounds={totalRounds}
              isFinalTurn={game.status === "final_turn"}
              helpButton={
                <HowToPlay
                  compact
                  variant={game.config.gridRows === 3 ? "nine-card" : "classic"}
                  specialAbilities={game.config.specialAbilities}
                  includeJokers={game.config.includeJokers}
                  jokerSingleScore={game.config.jokerSingleScore}
                  jokerPairScore={game.config.jokerPairScore}
                />
              }
            />

            {/* Score Strip - always-visible on mobile so you don't need to scroll */}
            {opponent && !isDesktop && (
              <ScoreStrip
                you={{
                  id: currentPlayer.id,
                  displayName: currentPlayer.displayName,
                  totalScore: currentPlayer.totalScore,
                  roundScore: calcRoundScore(currentPlayer.hand),
                  isYou: true,
                }}
                opponent={{
                  id: opponent.id,
                  displayName: opponent.displayName,
                  totalScore: opponent.totalScore,
                  roundScore: calcRoundScore(opponent.hand),
                  isYou: false,
                }}
              />
            )}
          </div>

          {/* Main game area — 3 columns on desktop: opponent | piles+actions | your hand */}
          <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-center gap-2 md:gap-8 mt-2 md:mt-3 min-h-0">
            {/* Opponent Hand */}
            {opponent && (
              <div className="rounded-lg bg-green-900/30 p-3 md:p-4 shrink-0">
                <PlayerHand
                  cards={opponent.hand}
                  label={t("opponentHand", { name: opponent.displayName, pts: calcRoundScore(opponent.hand) })}
                  isCurrentPlayer={false}
                  onCardClick={handleOpponentCardClick}
                  selectablePositions={opponentSelectablePositions}
                  matchedPositions={getMatchedPositions(opponent.hand)}
                  gridSize={{ rows: game.config.gridRows, cols: game.config.gridCols }}
                  size={isDesktop ? "lg" : "sm"}
                />
              </div>
            )}

            {/* Center: piles + drawn card + actions — moves to bottom on mobile */}
            <div className="order-3 md:order-2 flex flex-col items-center gap-3 shrink-0">
              {/* Piles - hidden when holding drawn card or choosing replacement */}
              {turnState === "idle" && (
                <div className="flex items-start justify-center gap-6 rounded-lg bg-green-900/30 p-3 md:p-4">
                  <DrawPile
                    count={game.deckCount}
                    selectable={isYourTurn && game.deckCount > 0}
                    onClick={handleDrawFromDeck}
                    size={isDesktop ? "xl" : "lg"}
                  />
                  <DiscardPile
                    topCard={topDiscard}
                    selectable={isYourTurn && topDiscard !== null}
                    onClick={handleTakeFromDiscard}
                    size={isDesktop ? "xl" : "lg"}
                  />
                </div>
              )}

              {/* Drawn Card Inline (normal card) */}
              {turnState === "holding_drawn_card" && game.drawnCard && (
                <DrawnCardInline
                  card={game.drawnCard}
                  onDiscard={handleDiscardCard}
                  disabled={isPending}
                />
              )}

              {/* Power Card UI */}
              {turnState === "holding_power_card" && game.drawnCard && (
                <div className="rounded-lg bg-purple-900/40 border-2 border-purple-500/60 p-4 flex flex-col items-center gap-3">
                  <p className="text-sm font-semibold text-purple-200 text-center">
                    {getAbilityLabel()}
                  </p>
                  <Card card={game.drawnCard} faceUp={true} size="xl" />
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={handleUseAbility}
                      disabled={isPending}
                      className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("useAbility")}
                    </button>
                    <button
                      onClick={() => setTurnState("holding_drawn_card")}
                      disabled={isPending}
                      className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("placeNormally")}
                    </button>
                    <button
                      onClick={handleDiscardCard}
                      disabled={isPending}
                      className="rounded-lg border border-dashed border-red-500/60 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("discard")}
                    </button>
                  </div>
                </div>
              )}

              {/* Cancel ability button */}
              {isAbilityState && (
                <button
                  onClick={handleCancelAbility}
                  disabled={isPending}
                  className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("cancelAbility")}
                </button>
              )}

              {/* Cancel button for discard pile selection */}
              {turnState === "choosing_replacement" && isChoosingForDiscard && (
                <button
                  onClick={handleCancel}
                  disabled={isPending}
                  className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("cancel")}
                </button>
              )}

              {/* Action Bar */}
              <ActionBar
                turnState={turnState}
                isYourTurn={isYourTurn}
              />
            </div>

            {/* Current Player Hand — sits above piles on mobile */}
            <div className={`order-2 md:order-3 rounded-lg p-3 md:p-4 shrink-0 transition-all duration-500 ${
              isYourTurn
                ? "bg-green-800/60 ring-2 ring-green-400/70 your-turn-glow"
                : "bg-green-900/50"
            }`}>
              <PlayerHand
                cards={currentPlayer.hand}
                label={t("yourHand", { pts: calcRoundScore(currentPlayer.hand) })}
                isCurrentPlayer={true}
                onCardClick={handleCardClick}
                selectablePositions={selectablePositions}
                droppablePositions={droppablePositions}
                matchedPositions={getMatchedPositions(currentPlayer.hand)}
                gridSize={{ rows: game.config.gridRows, cols: game.config.gridCols }}
                size={isDesktop ? "xl" : "md"}
              />
            </div>
          </div>

          {/* Bottom bar: scores + errors */}
          <div className="mt-auto pt-2 space-y-2">
            <ScoreBoard game={game} userId={userId} />

            {/* Error Display */}
            {(drawCard.error ||
              takeDiscardAndReplace.error ||
              placeDrawnCard.error ||
              discardDrawnCard.error ||
              uncoverCard.error ||
              jackAbilityMutation.error ||
              queenAbilityMutation.error ||
              kingAbilityMutation.error ||
              jokerAbilityMutation.error) && (
              <div className="rounded-lg bg-red-900/50 border-2 border-red-600 p-3 text-center">
                <p className="text-sm text-red-200">
                  {drawCard.error?.message ||
                    takeDiscardAndReplace.error?.message ||
                    placeDrawnCard.error?.message ||
                    discardDrawnCard.error?.message ||
                    uncoverCard.error?.message ||
                    jackAbilityMutation.error?.message ||
                    queenAbilityMutation.error?.message ||
                    kingAbilityMutation.error?.message ||
                    jokerAbilityMutation.error?.message}
                </p>
              </div>
            )}
          </div>

        {/* Reveal Card Confirmation */}
        {revealPosition !== null && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-xl bg-green-900 p-6 shadow-2xl border border-green-600">
              <h3 className="text-xl font-bold text-white text-center">
                {t("revealThisCard")}
              </h3>
              <p className="mt-2 text-sm text-green-300 text-center">
                {t("revealCardDesc")}
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setRevealPosition(null)}
                  className="flex-1 rounded-lg bg-green-800 px-4 py-3 font-semibold text-green-200 transition hover:bg-green-700"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={() => {
                    uncoverCard.mutate({ gameId: game.id, position: revealPosition });
                    setRevealPosition(null);
                  }}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-green-500 px-4 py-3 font-semibold text-white transition hover:bg-green-400 disabled:opacity-50"
                >
                  {t("reveal")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Peek Modal (Jack / Queen ability result) */}
        {peekedCard !== null && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-sm rounded-xl bg-purple-900 p-6 shadow-2xl border border-purple-500">
              <h3 className="text-xl font-bold text-white text-center mb-4">
                {t("peekModalTitle")}
              </h3>
              <div className="flex justify-center mb-6">
                <Card card={peekedCard} faceUp={true} size="xl" />
              </div>
              <button
                onClick={() => setPeekedCard(null)}
                className="w-full rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-500"
              >
                {t("peekModalClose")}
              </button>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
