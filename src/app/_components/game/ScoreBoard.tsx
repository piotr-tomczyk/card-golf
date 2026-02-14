"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";

type GameState = RouterOutputs["game"]["getByCode"];

interface ScoreBoardProps {
  game: GameState;
}

export function ScoreBoard({ game }: ScoreBoardProps) {
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
          <h3 className="text-xl font-bold text-white">Scores</h3>
          <div className="flex items-center gap-4">
            <div className="text-right">
              {game.players.map((player) => (
                <div key={player.id} className="text-sm">
                  <span className="text-green-300">{player.displayName}:</span>{" "}
                  <span className="font-bold text-white">{player.totalScore}</span>
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
                    <th className="text-left py-2 px-3 text-green-300">Round</th>
                    {game.players.map((player) => (
                      <th
                        key={player.id}
                        className="text-right py-2 px-3 text-green-300"
                      >
                        {player.displayName}
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
                    <td className="py-2 px-3 text-green-200">Total</td>
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
              No completed rounds yet
            </p>
          )}

          {/* Current Round Indicator */}
          <div className="text-center text-xs text-green-400">
            Currently playing Round {game.currentRound} of {game.config.totalRounds}
          </div>
        </div>
      )}
    </div>
  );
}
