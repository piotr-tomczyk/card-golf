"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, type RouterOutputs } from "@/trpc/react";
import { Confetti } from "./Confetti";

type GameState = RouterOutputs["game"]["getByCode"];

interface GameOverScreenProps {
  game: GameState;
  userId?: string;
}

export function GameOverScreen({ game, userId }: GameOverScreenProps) {
  const t = useTranslations("GameOverScreen");

  const isCurrentPlayer = (player: GameState["players"][number]) => {
    if (userId && !player.isGuest) return player.userId === userId;
    if (typeof window !== "undefined") {
      const guestId = localStorage.getItem("guestId");
      if (guestId && player.isGuest) return player.userId === `guest_${guestId}`;
    }
    return false;
  };
  const router = useRouter();

  const { data: roundScores } = api.game.getRoundScores.useQuery({
    gameId: game.id,
  });

  // Determine winner(s) — lowest total score wins; multiple players can tie
  const lowestScore = Math.min(...game.players.map((p) => p.totalScore));
  const winners = game.players.filter((p) => p.totalScore === lowestScore);
  const isDraw = winners.length > 1;

  const handlePlayAgain = () => {
    router.push("/");
  };

  const handleBackHome = () => {
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-800 to-green-950 px-4 py-8 text-white">
      <Confetti active={!isDraw} />
      <div className="w-full max-w-4xl space-y-8">
        {/* Winner Announcement */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-extrabold tracking-tight sm:text-7xl animate-bounce">
            {isDraw ? "🤝" : "🏆"}
          </h1>
          <h2 className="text-5xl font-extrabold tracking-tight sm:text-6xl text-yellow-400">
            {isDraw
              ? t("itsADraw")
              : t("wins", { name: winners[0]!.displayName })}
          </h2>
          <p className="text-2xl text-green-200">
            {isDraw
              ? t("drawDesc", { names: winners.map((w) => w.displayName).join(" & "), score: lowestScore })
              : t("finalScore", { score: lowestScore })}
          </p>
        </div>

        {/* Final Standings */}
        <div className="rounded-lg bg-green-900/50 p-6">
          <h3 className="text-2xl font-bold text-center mb-6">{t("finalStandings")}</h3>
          <div className="space-y-3">
            {game.players
              .sort((a, b) => a.totalScore - b.totalScore)
              .map((player, index, sorted) => {
                // Compute dense rank: tied players share the same rank
                const rank = sorted.findIndex((p) => p.totalScore === player.totalScore) + 1;
                return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-lg p-4 ${
                    player.totalScore === lowestScore
                      ? "bg-yellow-900/50 border-2 border-yellow-600"
                      : "bg-green-800/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-700 text-2xl font-bold">
                      {rank}
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {player.displayName}
                        {isCurrentPlayer(player) && (
                          <span className="ml-1.5 text-sm font-normal text-green-400">{t("youSuffix")}</span>
                        )}
                      </p>
                      {player.isGuest && (
                        <p className="text-sm text-green-400">{t("guest")}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-white">
                      {player.totalScore}
                    </p>
                    <p className="text-sm text-green-300">{t("points")}</p>
                  </div>
                </div>
                );
              })}
          </div>
        </div>

        {/* Round-by-Round Breakdown */}
        {roundScores && roundScores.length > 0 && (
          <div className="rounded-lg bg-green-900/50 p-6">
            <h3 className="text-xl font-bold text-center mb-4">
              {t("roundByRound")}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-green-700">
                    <th className="text-left py-2 px-3 text-green-300">{t("round")}</th>
                    {game.players.map((player) => (
                      <th
                        key={player.id}
                        className="text-right py-2 px-3 text-green-300"
                      >
                        {player.displayName}
                        {isCurrentPlayer(player) && (
                          <span className="ml-1 font-normal text-green-500">{t("youSuffix")}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(
                    { length: game.config.totalRounds },
                    (_, i) => i + 1
                  ).map((roundNum) => {
                    const roundData = roundScores.filter(
                      (s) => s.roundNumber === roundNum
                    );
                    return (
                      <tr
                        key={roundNum}
                        className="border-b border-green-800/50 hover:bg-green-800/30"
                      >
                        <td className="py-2 px-3 text-white font-semibold">
                          {roundNum}
                        </td>
                        {game.players.map((player) => {
                          const score = roundData.find(
                            (s) => s.playerId === player.id
                          );
                          return (
                            <td
                              key={player.id}
                              className="text-right py-2 px-3 text-white"
                            >
                              {score?.score ?? "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 border-green-600 font-bold">
                    <td className="py-2 px-3 text-green-200">{t("total")}</td>
                    {game.players.map((player) => (
                      <td
                        key={player.id}
                        className="text-right py-2 px-3 text-white text-lg"
                      >
                        {player.totalScore}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Game Stats */}
        <div className="rounded-lg bg-green-900/50 p-6">
          <h3 className="text-xl font-bold text-center mb-4">{t("gameStats")}</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-white">
                {game.config.totalRounds}
              </p>
              <p className="text-sm text-green-300">{t("roundsPlayed")}</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{game.turnNumber}</p>
              <p className="text-sm text-green-300">{t("totalTurns")}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={handlePlayAgain}
            className="rounded-lg bg-green-600 px-8 py-4 text-xl font-semibold text-white transition hover:bg-green-500"
          >
            {t("playAgain")}
          </button>
          <button
            onClick={handleBackHome}
            className="rounded-lg bg-green-800 px-8 py-4 text-xl font-semibold text-white transition hover:bg-green-700"
          >
            {t("backToHome")}
          </button>
        </div>

        {/* Thank You Message */}
        <div className="text-center text-sm text-green-400">
          <p>{t("thanksForPlaying")}</p>
        </div>
      </div>
    </div>
  );
}
