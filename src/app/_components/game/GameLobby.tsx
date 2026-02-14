"use client";

import { useState } from "react";
import type { RouterOutputs } from "@/trpc/react";

type GameState = RouterOutputs["game"]["getByCode"];

interface GameLobbyProps {
  game: GameState;
}

export function GameLobby({ game }: GameLobbyProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/game/${game.code}`
    : "";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(game.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const maxPlayers = game.config.maxPlayers;
  const currentPlayers = game.players.length;
  const isFull = currentPlayers >= maxPlayers;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-800 to-green-950 px-4 py-16 text-white">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl mb-4">
            Game Lobby
          </h1>
          <p className="text-xl text-green-200">
            Waiting for players to join...
          </p>
        </div>

        {/* Game Code */}
        <div className="rounded-lg bg-green-900/50 p-8 space-y-4">
          <div className="text-center">
            <p className="text-sm text-green-300 mb-2">Game Code</p>
            <button
              onClick={copyCode}
              className="text-6xl font-mono font-bold tracking-wider hover:text-green-300 transition"
              title="Click to copy"
            >
              {game.code}
            </button>
            {copied && (
              <p className="text-sm text-green-400 mt-2">Copied!</p>
            )}
          </div>

          <button
            onClick={copyToClipboard}
            className="w-full rounded-lg bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-600"
          >
            {copied ? "Link Copied!" : "Copy Share Link"}
          </button>
        </div>

        {/* Players List */}
        <div className="rounded-lg bg-green-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Players</h2>
            <span className={`text-lg font-semibold ${isFull ? "text-green-400" : "text-green-300"}`}>
              {currentPlayers} / {maxPlayers}
            </span>
          </div>

          <div className="space-y-2">
            {game.players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg bg-green-800/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-700 font-bold">
                    {player.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{player.displayName}</p>
                    {player.isGuest && (
                      <p className="text-xs text-green-400">Guest</p>
                    )}
                  </div>
                </div>
                {index === 0 && (
                  <span className="rounded-full bg-yellow-600 px-3 py-1 text-xs font-semibold">
                    HOST
                  </span>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: maxPlayers - currentPlayers }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 rounded-lg border-2 border-dashed border-green-700 p-4 opacity-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-800">
                  ?
                </div>
                <p className="text-green-300">Waiting for player...</p>
              </div>
            ))}
          </div>
        </div>

        {/* Status Message */}
        {isFull && (
          <div className="rounded-lg bg-green-600 p-4 text-center font-semibold">
            Game is starting...
          </div>
        )}

        {!isFull && (
          <div className="text-center text-sm text-green-300">
            <p>Share the game code or link with your friends</p>
            <p className="mt-1">The game will start automatically when all players join</p>
          </div>
        )}
      </div>
    </div>
  );
}
