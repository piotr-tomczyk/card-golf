"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, type RouterOutputs } from "@/trpc/react";

type GameState = RouterOutputs["game"]["getByCode"];

interface ScoreBoardProps {
  game: GameState;
  userId?: string;
}

export function ScoreBoard({ game, userId }: ScoreBoardProps) {
  const t = useTranslations("ScoreBoard");

  const isCurrentPlayer = (player: GameState["players"][number]) => {
    if (userId && !player.isGuest) return player.userId === userId;
    if (typeof window !== "undefined") {
      const guestId = localStorage.getItem("guestId");
      if (guestId && player.isGuest) return player.userId === `guest_${guestId}`;
    }
    return false;
  };
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: roundScores } = api.game.getRoundScores.useQuery(
    { gameId: game.id },
    { enabled: isExpanded }
  );

  return (
    <div className="rounded-lg bg-green-900/50 overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-green-800/50 transition"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">{t("totalScores")}</h3>
          <div className="flex items-center gap-4">
            <div className="text-right">
              {game.players.map((player) => (
                <div key={player.id} className="flex items-baseline justify-end gap-1 text-sm max-w-[160px]">
                  <span className="text-green-300 truncate min-w-0">
                    {player.displayName}
                  </span>
                  {isCurrentPlayer(player) && (
                    <span className="text-green-500 shrink-0">{t("youSuffix")}</span>
                  )}
                  <span className="text-green-300 shrink-0">:</span>
                  <span className="font-bold text-white shrink-0">{player.totalScore}</span>
                </div>
              ))}
            </div>
            <div className="text-green-300">
              {isExpanded ? "▲" : "▼"}
            </div>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-green-700 p-4 space-y-4">
          {roundScores && roundScores.length > 0 ? (
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
                          <span className="ml-1 text-green-500">{t("youSuffix")}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(
                    { length: Math.max(...roundScores.map((s) => s.roundNumber)) },
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
          ) : (
            <p className="text-center text-green-300 text-sm">
              {t("noRoundsYet")}
            </p>
          )}

          {/* Current Round Indicator */}
          <div className="text-center text-xs text-green-400">
            {t("currentlyPlayingRound", { current: game.currentRound, total: game.config.totalRounds })}
          </div>
        </div>
      )}
    </div>
  );
}
