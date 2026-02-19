"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "./Card";
import { api, type RouterOutputs } from "@/trpc/react";
import type { Card as CardType } from "@/server/game/types";
import { getMatchedLineTypes } from "@/server/game/scoring";

type GameState = RouterOutputs["game"]["getByCode"];

interface RoundEndScreenProps {
  game: GameState;
  refetch: () => void;
  userId?: string;
}

/** Cards arranged in a grid, each flipping in with a staggered delay */
function RevealGrid({
  cards,
  cols,
  startDelay = 0,
  matchedPositions = {},
}: {
  cards: { card: CardType | null; faceUp: boolean }[];
  cols: number;
  startDelay?: number;
  matchedPositions?: Record<number, "column" | "row" | "diagonal">;
}) {
  return (
    <>
      <style>{`
        @keyframes cardFlipIn {
          0%   { opacity: 0; transform: rotateY(80deg) scale(0.85); }
          60%  { transform: rotateY(-8deg) scale(1.04); }
          100% { opacity: 1; transform: rotateY(0deg) scale(1); }
        }
        @keyframes scorePop {
          0%   { opacity: 0; transform: translateY(10px) scale(0.8); }
          70%  { transform: translateY(-3px) scale(1.06); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        className="inline-grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}
      >
        {cards.map((pc, i) => (
          <div
            key={i}
            style={{
              animation: "cardFlipIn 0.45s cubic-bezier(0.34,1.4,0.64,1) both",
              animationDelay: `${startDelay + i * 90}ms`,
            }}
          >
            <Card
              card={pc.card}
              faceUp={true}
              size="sm"
              matched={matchedPositions[i] ?? false}
            />
          </div>
        ))}
      </div>
    </>
  );
}

export function RoundEndScreen({ game, refetch, userId }: RoundEndScreenProps) {
  const t = useTranslations("RoundEndScreen");

  const isCurrentPlayer = (player: GameState["players"][number]) => {
    if (userId && !player.isGuest) return player.userId === userId;
    if (typeof window !== "undefined") {
      const guestId = localStorage.getItem("guestId");
      if (guestId && player.isGuest) return player.userId === `guest_${guestId}`;
    }
    return false;
  };
  const [showScores, setShowScores] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const startNextRound = api.game.startNextRound.useMutation({
    onSuccess: () => refetch(),
  });

  const { data: roundScores } = api.game.getRoundScores.useQuery({
    gameId: game.id,
  });

  const currentRoundScores = roundScores?.filter(
    (s) => s.roundNumber === game.currentRound,
  );

  // Staggered reveal timing
  const cols = game.config.gridCols;
  const cardCount = game.players[0]?.hand.length ?? 6;
  const lastCardDelay = cardCount * 90; // ms after last card per player

  useEffect(() => {
    // Two players × cardCount cards, then scores
    const scoreDelay = 200 + lastCardDelay + game.players.length * lastCardDelay;
    const winnerDelay = scoreDelay + 350;
    const buttonDelay = winnerDelay + 400;

    const t1 = setTimeout(() => setShowScores(true), scoreDelay);
    const t2 = setTimeout(() => setShowWinner(true), winnerDelay);
    const t3 = setTimeout(() => setShowButton(true), buttonDelay);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [lastCardDelay, game.players.length]);

  // Round winner logic
  const lowestRoundScore =
    currentRoundScores && currentRoundScores.length > 0
      ? Math.min(...currentRoundScores.map((s) => s.score))
      : undefined;

  const roundWinnerIds =
    lowestRoundScore !== undefined
      ? (currentRoundScores
          ?.filter((s) => s.score === lowestRoundScore)
          .map((s) => s.playerId) ?? [])
      : [];

  const isRoundDraw = roundWinnerIds.length > 1;
  const roundWinnerPlayers = game.players.filter((p) =>
    roundWinnerIds.includes(p.id),
  );

  // Matched lines — uses face-up-all hand since all cards are revealed at round end
  const getMatchedPositions = (
    hand: { card: string | null; faceUp: boolean }[],
  ) => getMatchedLineTypes(hand, cols);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-green-900 via-green-950 to-black text-white">
      {/* Felt texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,1) 2px,rgba(255,255,255,1) 4px), repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(255,255,255,1) 2px,rgba(255,255,255,1) 4px)",
        }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-start gap-5 px-3 py-5 md:justify-center">
        {/* Header */}
        <div
          className="text-center"
          style={{ animation: "slideDown 0.5s ease both" }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-green-400">
            {t("roundOf", { current: game.currentRound, total: game.config.totalRounds })}
          </p>
          <h1 className="mt-1 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
            {t("cardsDown")}
          </h1>
          <div className="mx-auto mt-2 h-0.5 w-16 rounded-full bg-green-500/50" />
        </div>

        {/* Player hands — cascade in */}
        <div className="flex w-full max-w-2xl flex-col gap-4">
          {game.players.map((player, playerIdx) => {
            const roundScore = currentRoundScores?.find(
              (s) => s.playerId === player.id,
            );
            const isWinner = roundWinnerIds.includes(player.id);
            const allFaceUp = player.hand.map((c) => ({ ...c, faceUp: true }));
            const matched = getMatchedPositions(allFaceUp);
            // Stagger: second player starts after first player's last card
            const playerStartDelay = 200 + playerIdx * (cardCount * 90 + 150);

            return (
              <div
                key={player.id}
                className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
                  isWinner
                    ? "border-amber-500/60 bg-amber-950/40 shadow-lg shadow-amber-900/30"
                    : "border-green-800/40 bg-green-950/40"
                }`}
                style={{
                  animation: "slideDown 0.4s ease both",
                  animationDelay: `${playerIdx * 120}ms`,
                }}
              >
                {/* Winner shimmer */}
                {isWinner && !isRoundDraw && (
                  <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-amber-400/20" />
                )}

                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isWinner && (
                      <span className="text-base">{isRoundDraw ? "🤝" : "🏆"}</span>
                    )}
                    <span className="text-base font-bold text-white">
                      {player.displayName}
                      {isCurrentPlayer(player) && (
                        <span className="ml-1.5 text-sm font-normal text-green-400">{t("youSuffix")}</span>
                      )}
                    </span>
                  </div>

                  {/* Score — pops in after cards */}
                  <div
                    className="text-right"
                    style={{
                      opacity: showScores ? 1 : 0,
                      animation: showScores
                        ? "scorePop 0.45s cubic-bezier(0.34,1.4,0.64,1) both"
                        : "none",
                    }}
                  >
                    <span
                      className={`text-3xl font-black tabular-nums ${
                        isWinner ? "text-amber-300" : "text-white"
                      }`}
                    >
                      {roundScore?.score ?? 0}
                    </span>
                    <p className="text-xs text-green-400">{t("thisRound")}</p>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex justify-center">
                  <RevealGrid
                    cards={allFaceUp}
                    cols={cols}
                    startDelay={playerStartDelay}
                    matchedPositions={matched}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Winner announcement */}
        <div
          className="w-full max-w-2xl rounded-xl border border-green-700/40 bg-green-950/60 px-6 py-4 text-center"
          style={{
            opacity: showWinner ? 1 : 0,
            animation: showWinner
              ? "scorePop 0.5s cubic-bezier(0.34,1.4,0.64,1) both"
              : "none",
          }}
        >
          {roundWinnerPlayers.length > 0 ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-green-400">
                {isRoundDraw ? t("roundResult") : t("roundWinner")}
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                {isRoundDraw
                  ? t("tied", { names: roundWinnerPlayers.map((p) => p.displayName).join(" & ") })
                  : t("winsRound", { name: roundWinnerPlayers[0]!.displayName })}
              </p>
            </>
          ) : (
            <p className="text-green-400">{t("calculatingScores")}</p>
          )}

          {/* Running totals */}
          <div className="mt-4 flex justify-center gap-6">
            {game.players
              .slice()
              .sort((a, b) => a.totalScore - b.totalScore)
              .map((player) => (
                <div key={player.id} className="text-center">
                  <p className="text-xs text-green-400">{player.displayName}</p>
                  <p className="text-xl font-black tabular-nums text-white">
                    {player.totalScore}
                  </p>
                  <p className="text-[10px] text-green-500">{t("total")}</p>
                </div>
              ))}
          </div>
          <p className="mt-2 text-xs text-green-600">
            {t("roundsComplete", { current: game.currentRound, total: game.config.totalRounds })}
          </p>
        </div>

        {/* CTA */}
        <div
          style={{
            opacity: showButton ? 1 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: showButton ? "auto" : "none",
          }}
        >
          <button
            onClick={() => startNextRound.mutate({ gameId: game.id })}
            disabled={startNextRound.isPending}
            className="rounded-xl bg-green-600 px-10 py-4 text-lg font-bold uppercase tracking-wide text-white shadow-lg shadow-green-900/50 transition hover:bg-green-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {startNextRound.isPending
              ? t("starting")
              : game.currentRound < game.config.totalRounds
                ? t("nextRound")
                : t("viewFinalResults")}
          </button>
        </div>

        {startNextRound.error && (
          <p className="text-sm text-red-400">
            {startNextRound.error.message}
          </p>
        )}
      </div>
    </div>
  );
}
