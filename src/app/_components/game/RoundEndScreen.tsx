"use client";

import { PlayerHand } from "./PlayerHand";
import { api, type RouterOutputs } from "@/trpc/react";

type GameState = RouterOutputs["game"]["getByCode"];

interface RoundEndScreenProps {
  game: GameState;
  refetch: () => void;
}

export function RoundEndScreen({ game, refetch }: RoundEndScreenProps) {
  const startNextRound = api.game.startNextRound.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const { data: roundScores } = api.game.getRoundScores.useQuery({
    gameId: game.id,
  });

  const currentRoundScores = roundScores?.filter(
    (s) => s.roundNumber === game.currentRound
  );

  const handleNextRound = () => {
    startNextRound.mutate({ gameId: game.id });
  };

  // Calculate who won this round
  const roundWinner = currentRoundScores?.reduce(
    (lowest, current) =>
      current.score < lowest.score ? current : lowest,
    currentRoundScores[0]
  );

  const winnerPlayer = game.players.find((p) => p.id === roundWinner?.playerId);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-800 to-green-950 px-4 py-8 text-white">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            Round {game.currentRound} Complete!
          </h1>
          {winnerPlayer && (
            <p className="text-2xl text-green-300">
              {winnerPlayer.displayName} wins this round!
            </p>
          )}
        </div>

        {/* Players' Final Hands */}
        <div className="space-y-6">
          {game.players.map((player) => {
            const roundScore = currentRoundScores?.find(
              (s) => s.playerId === player.id
            );

            return (
              <div
                key={player.id}
                className={`rounded-lg p-6 ${
                  player.id === roundWinner?.playerId
                    ? "bg-yellow-900/30 border-2 border-yellow-600"
                    : "bg-green-900/30"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-2xl font-bold">{player.displayName}</h3>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-300">
                      {roundScore?.score ?? 0}
                    </p>
                    <p className="text-sm text-green-400">this round</p>
                  </div>
                </div>

                {/* Show all cards revealed */}
                <PlayerHand
                  cards={player.hand.map((card) => ({
                    ...card,
                    faceUp: true,
                  }))}
                  label="Final Hand"
                  isCurrentPlayer={true}
                  size="sm"
                />

                {/* Column bonuses */}
                {roundScore && (
                  <div className="mt-4 text-sm text-green-300">
                    <p>Hand breakdown calculated</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Running Totals */}
        <div className="rounded-lg bg-green-900/50 p-6">
          <h3 className="text-xl font-bold text-center mb-4">Running Totals</h3>
          <div className="grid grid-cols-2 gap-4">
            {game.players.map((player) => (
              <div
                key={player.id}
                className="text-center rounded-lg bg-green-800/50 p-4"
              >
                <p className="text-lg font-semibold text-green-200">
                  {player.displayName}
                </p>
                <p className="text-4xl font-bold text-white mt-2">
                  {player.totalScore}
                </p>
                <p className="text-xs text-green-400 mt-1">total points</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next Round Button */}
        <div className="flex justify-center">
          <button
            onClick={handleNextRound}
            disabled={startNextRound.isPending}
            className="rounded-lg bg-green-600 px-12 py-6 text-2xl font-semibold text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {startNextRound.isPending
              ? "Starting..."
              : game.currentRound < game.config.totalRounds
                ? "Start Next Round"
                : "View Final Results"}
          </button>
        </div>

        {startNextRound.error && (
          <div className="rounded-lg bg-red-900/50 border-2 border-red-600 p-4 text-center">
            <p className="text-red-200">{startNextRound.error.message}</p>
          </div>
        )}

        {/* Progress */}
        <div className="text-center text-sm text-green-400">
          {game.currentRound} of {game.config.totalRounds} rounds complete
        </div>
      </div>
    </div>
  );
}
