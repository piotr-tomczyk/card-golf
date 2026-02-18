"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, type RouterOutputs } from "@/trpc/react";
import { GameLobby } from "./GameLobby";
import { SetupPhase } from "./SetupPhase";
import { PlayingPhase } from "./PlayingPhase";
import { RoundEndScreen } from "./RoundEndScreen";
import { GameOverScreen } from "./GameOverScreen";

interface GameBoardProps {
  code: string;
  userId?: string;
  initialGame?: RouterOutputs["game"]["getByCode"];
}

export function GameBoard({ code, userId, initialGame }: GameBoardProps) {
  const t = useTranslations("GameBoard");
  const router = useRouter();
  const hasAttemptedJoin = useRef(false);
  const [needsGuestName, setNeedsGuestName] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState("");

  // Check for guest identity immediately on mount (before any queries fire)
  const [hasIdentity, setHasIdentity] = useState(() => {
    if (typeof window === "undefined") return true; // SSR: assume yes
    if (userId) return true; // authenticated user
    return !!localStorage.getItem("guestId");
  });

  useEffect(() => {
    if (!userId && typeof window !== "undefined" && !localStorage.getItem("guestId")) {
      setNeedsGuestName(true);
      setHasIdentity(false);
    }
  }, [userId]);

  const joinGame = api.game.join.useMutation({
    onSuccess: () => {
      void refetch();
    },
    onError: (error) => {
      // Log the error for debugging
      console.log("Auto-join error:", error.message);
      // If game already started, we're probably already in it or it's too late
      // Don't show error to user, just refetch to get current state
      if (error.message.includes("already started")) {
        void refetch();
      }
    },
  });
  // Fetch game state with polling - disabled until guest has identity
  const { data: game, isLoading, error, refetch } = api.game.getByCode.useQuery(
    { code },
    {
      enabled: hasIdentity,
      // Poll every 2 seconds when waiting for game state changes
      refetchInterval: (query) => {
        const game = query.state.data;
        if (!game) return false;

        // Poll frequently in waiting/setup phases
        if (game.status === "waiting" || game.status === "setup") {
          return 2000;
        }

        // Poll more frequently during active play (1-2 sec) to catch turn changes
        // This prevents "Not your turn" errors from stale state
        if (game.status === "playing" || game.status === "final_turn") {
          return 1500;
        }

        // Poll at round end and game over
        if (game.status === "round_ended" || game.status === "finished") {
          return 2000;
        }

        return false;
      },
      // Keep previous data while refetching for smooth transitions
      placeholderData: (previousData) => previousData,
      // Use initialData if provided
      initialData: initialGame,
    }
  );

  // Auto-join game if not already a player
  useEffect(() => {
    if (!game) return;

    const guestId = typeof window !== "undefined" ? localStorage.getItem("guestId") : null;

    // Check if current user is already in the game
    const isAlreadyInGame = game.players.some((p) => {
      if (userId && !p.isGuest) {
        return p.userId === userId;
      }
      if (guestId && p.isGuest) {
        // Backend adds "guest_" prefix to the guestId
        return p.userId === `guest_${guestId}`;
      }
      return false;
    });

    // If already in the game, mark as attempted to prevent future joins
    if (isAlreadyInGame) {
      hasAttemptedJoin.current = true;
      return;
    }

    // If not in game, game is waiting, and we haven't tried yet, auto-join
    if (!hasAttemptedJoin.current && game.status === "waiting" && !joinGame.isPending) {
      hasAttemptedJoin.current = true;
      joinGame.mutate({ code });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.status, game?.players.length, userId, code]);

  const handleGuestNameSubmit = () => {
    const name = guestNameInput.trim();
    if (!name) return;

    localStorage.setItem("guestName", name);
    if (!localStorage.getItem("guestId")) {
      const newGuestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("guestId", newGuestId);
    }

    // Reload the page so the tRPC client picks up the new localStorage headers
    router.refresh();
    setNeedsGuestName(false);
    setHasIdentity(true);
  };

  if (needsGuestName) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-800 to-green-950 text-white">
        <div className="w-full max-w-md space-y-4 px-4">
          <div className="rounded-lg bg-green-900/50 p-6 space-y-4">
            <h2 className="text-2xl font-bold text-center">
              {t("whatsYourName")}
            </h2>
            <p className="text-sm text-green-200 text-center">
              {t("enterDisplayName")}
            </p>
            <input
              type="text"
              value={guestNameInput}
              onChange={(e) => setGuestNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGuestNameSubmit()}
              placeholder={t("yourNamePlaceholder")}
              maxLength={30}
              className="w-full rounded-lg bg-green-950 px-4 py-3 text-white placeholder-green-400 outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <button
              onClick={handleGuestNameSubmit}
              disabled={!guestNameInput.trim()}
              className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("continue")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !game || joinGame.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-800 to-green-950 text-white">
        <div className="text-center">
          <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-green-300 border-t-transparent mx-auto"></div>
          <p className="text-xl">
            {joinGame.isPending ? t("joiningGame") : t("loadingGame")}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-800 to-green-950 text-white">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-4xl font-bold text-red-400">{t("gameNotFound")}</h1>
          <p className="text-lg text-green-200">
            {t("gameNotFoundDesc")}
          </p>
          <a
            href="/"
            className="inline-block rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500"
          >
            {t("backToHome")}
          </a>
        </div>
      </div>
    );
  }

  // Render appropriate phase component based on game status
  switch (game.status) {
    case "waiting":
      return <GameLobby game={game} />;

    case "setup":
      return <SetupPhase game={game} refetch={refetch} userId={userId} />;

    case "playing":
    case "final_turn":
      return <PlayingPhase game={game} refetch={refetch} userId={userId} />;

    case "round_ended":
      return <RoundEndScreen game={game} refetch={refetch} />;

    case "finished":
      return <GameOverScreen game={game} />;

    case "abandoned":
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-800 to-green-950 text-white">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-4xl font-bold text-yellow-400">
              {t("gameAbandoned")}
            </h1>
            <p className="text-lg text-green-200">
              {t("gameAbandonedDesc")}
            </p>
            <a
              href="/"
              className="inline-block rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500"
            >
              {t("backToHome")}
            </a>
          </div>
        </div>
      );

    default:
      return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-800 to-green-950 text-white">
          <div className="text-center">
            <p className="text-xl">{t("unknownStatus", { status: game.status })}</p>
          </div>
        </div>
      );
  }
}
