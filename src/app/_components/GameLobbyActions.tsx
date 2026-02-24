"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/trpc/react";
import type { Session } from "next-auth";

interface GameLobbyActionsProps {
  session: Session | null;
}

export function GameLobbyActions({ session }: GameLobbyActionsProps) {
  const t = useTranslations("LobbyActions");
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  const extractCode = (value: string): string => {
    // Accept a full game URL like https://example.com/game/ABC123
    const match = /\/game\/([A-Za-z0-9]{6})/i.exec(value);
    if (match) return match[1]!.toUpperCase();
    // Plain code — uppercase, strip non-alphanumeric, cap at 6
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  };
  const [guestName, setGuestName] = useState("");
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [totalRounds, setTotalRounds] = useState(9);
  const [gridMode, setGridMode] = useState<"classic" | "nine-card">("classic");
  const [specialAbilities, setSpecialAbilities] = useState(false);
  const [includeJokers, setIncludeJokers] = useState(false);
  const [jokerSingleScore, setJokerSingleScore] = useState(15);
  const [jokerPairScore, setJokerPairScore] = useState(-5);

  // Load guest name from localStorage on mount
  useEffect(() => {
    setIsHydrated(true);
    if (!session?.user) {
      const savedName = localStorage.getItem("guestName");
      if (savedName) {
        setGuestName(savedName);
      } else {
        setShowGuestInput(true);
      }
    }
  }, [session]);

  const createGame = api.game.create.useMutation({
    onSuccess: (data) => {
      console.log("Create game success:", data);
      router.push(`/game/${data.code}`);
    },
    onError: (error) => {
      console.error("Create game error:", error);
    },
  });

  const joinGame = api.game.join.useMutation({
    onSuccess: (data) => {
      console.log("Join game success:", data);
      router.push(`/game/${data.code}`);
    },
    onError: (error) => {
      console.error("Join game error:", error);
    },
  });

  const handleCreateGame = () => {
    console.log("handleCreateGame - session:", session, "guestName:", guestName);

    // If guest and no name, prompt for name
    if (!session?.user && !guestName) {
      console.log("No guest name, showing input");
      setShowGuestInput(true);
      return;
    }

    // Save guest name and generate ID if guest
    if (!session?.user && guestName) {
      console.log("Saving guest name and generating ID");
      localStorage.setItem("guestName", guestName);

      // Generate and save guest ID if it doesn't exist
      if (!localStorage.getItem("guestId")) {
        const newGuestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log("Generated new guestId:", newGuestId);
        localStorage.setItem("guestId", newGuestId);
      } else {
        console.log("Using existing guestId:", localStorage.getItem("guestId"));
      }
    }

    console.log("Calling createGame.mutate()");
    createGame.mutate({ totalRounds, gridMode, specialAbilities, includeJokers, jokerSingleScore, jokerPairScore });
  };

  const handleJoinGame = () => {
    if (!joinCode.trim()) return;

    // If guest and no name, prompt for name
    if (!session?.user && !guestName) {
      setShowGuestInput(true);
      return;
    }

    // Save guest name and generate ID if guest
    if (!session?.user && guestName) {
      localStorage.setItem("guestName", guestName);

      // Generate and save guest ID if it doesn't exist
      if (!localStorage.getItem("guestId")) {
        const newGuestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("guestId", newGuestId);
      }
    }

    joinGame.mutate({ code: joinCode.toUpperCase() });
  };

  const saveGuestName = () => {
    if (guestName.trim()) {
      localStorage.setItem("guestName", guestName);

      // Generate and save guest ID if it doesn't exist
      if (!localStorage.getItem("guestId")) {
        const newGuestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("guestId", newGuestId);
      }

      setShowGuestInput(false);
    }
  };

  // Prevent hydration mismatch by showing a loading state until client-side hydration is complete
  if (!isHydrated) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="rounded-lg bg-green-900/50 p-6 space-y-4">
          <div className="h-8 bg-green-800/50 rounded animate-pulse" />
          <div className="h-12 bg-green-800/50 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session?.user && showGuestInput) {
    return (
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-lg bg-green-900/50 p-6 space-y-4">
          <h2 className="text-2xl font-bold text-center">
            {t("whatsYourName")}
          </h2>
          <p className="text-sm text-green-200 text-center">
            {t("enterDisplayName")}
          </p>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveGuestName()}
            placeholder={t("yourNamePlaceholder")}
            maxLength={30}
            className="w-full rounded-lg bg-green-950 px-4 py-3 text-white placeholder-green-400 outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
          <button
            onClick={saveGuestName}
            disabled={!guestName.trim()}
            className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("continue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Create Game */}
      <div className="rounded-lg bg-green-900/50 p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">{t("createNewGame")}</h2>

        {/* Game mode selector */}
        <div className="rounded-lg bg-green-950/50 px-4 py-3 space-y-2">
          <span className="text-green-200 font-medium text-sm">{t("gameMode")}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setGridMode("classic")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                gridMode === "classic"
                  ? "bg-green-600 text-white"
                  : "bg-green-900 text-green-300 hover:bg-green-800"
              }`}
            >
              {t("classicMode")}
            </button>
            <button
              onClick={() => setGridMode("nine-card")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                gridMode === "nine-card"
                  ? "bg-green-600 text-white"
                  : "bg-green-900 text-green-300 hover:bg-green-800"
              }`}
            >
              {t("nineCardMode")}
            </button>
          </div>
        </div>

        {/* Power Cards toggle */}
        <button
          onClick={() => setSpecialAbilities((v) => !v)}
          className={`w-full rounded-lg px-4 py-3 text-left transition ${
            specialAbilities
              ? "bg-purple-800/60 ring-2 ring-purple-500/60"
              : "bg-green-950/50 hover:bg-green-900/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-medium text-sm ${specialAbilities ? "text-purple-200" : "text-green-200"}`}>
              {t("powerCards")}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition ${
              specialAbilities ? "bg-purple-500 text-white" : "bg-green-800 text-green-400"
            }`}>
              {specialAbilities ? "ON" : "OFF"}
            </span>
          </div>
          <p className={`mt-0.5 text-xs ${specialAbilities ? "text-purple-300" : "text-green-400"}`}>
            {t("powerCardsDesc")}
          </p>
        </button>

        {/* Jokers toggle */}
        <button
          onClick={() => setIncludeJokers((v) => !v)}
          className={`w-full rounded-lg px-4 py-3 text-left transition ${
            includeJokers
              ? "bg-yellow-800/50 ring-2 ring-yellow-500/60"
              : "bg-green-950/50 hover:bg-green-900/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-medium text-sm ${includeJokers ? "text-yellow-200" : "text-green-200"}`}>
              {t("includeJokers")}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full transition ${
              includeJokers ? "bg-yellow-500 text-black" : "bg-green-800 text-green-400"
            }`}>
              {includeJokers ? "ON" : "OFF"}
            </span>
          </div>
          <p className={`mt-0.5 text-xs ${includeJokers ? "text-yellow-300" : "text-green-400"}`}>
            {t("includeJokersDesc")}
          </p>
        </button>

        {/* Joker scoring options — shown when Jokers are enabled */}
        {includeJokers && (
          <div className="rounded-lg bg-yellow-900/20 border border-yellow-700/40 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-yellow-200 text-sm font-medium">{t("jokerSingleScore")}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setJokerSingleScore((v) => Math.max(-20, v - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-800 text-base font-bold leading-none hover:bg-yellow-700 transition"
                  aria-label={t("jokerScoreDecrease")}
                >
                  −
                </button>
                <span className="w-8 text-center text-base font-bold text-yellow-100">
                  {jokerSingleScore > 0 ? `+${jokerSingleScore}` : jokerSingleScore}
                </span>
                <button
                  onClick={() => setJokerSingleScore((v) => Math.min(25, v + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-800 text-base font-bold leading-none hover:bg-yellow-700 transition"
                  aria-label={t("jokerScoreIncrease")}
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-yellow-200 text-sm font-medium">{t("jokerPairScore")}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setJokerPairScore((v) => Math.max(-20, v - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-800 text-base font-bold leading-none hover:bg-yellow-700 transition"
                  aria-label={t("jokerScoreDecrease")}
                >
                  −
                </button>
                <span className="w-8 text-center text-base font-bold text-yellow-100">
                  {jokerPairScore > 0 ? `+${jokerPairScore}` : jokerPairScore}
                </span>
                <button
                  onClick={() => setJokerPairScore((v) => Math.min(20, v + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-800 text-base font-bold leading-none hover:bg-yellow-700 transition"
                  aria-label={t("jokerScoreIncrease")}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rounds picker */}
        <div className="flex items-center justify-between rounded-lg bg-green-950/50 px-4 py-3">
          <span className="text-green-200 font-medium">{t("rounds")}</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTotalRounds((r) => Math.max(1, r - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-green-700 text-xl font-bold leading-none hover:bg-green-600 transition"
              aria-label={t("fewerRounds")}
            >
              −
            </button>
            <span className="w-6 text-center text-xl font-bold">{totalRounds}</span>
            <button
              onClick={() => setTotalRounds((r) => Math.min(18, r + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-green-700 text-xl font-bold leading-none hover:bg-green-600 transition"
              aria-label={t("moreRounds")}
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={handleCreateGame}
          disabled={createGame.isPending}
          className="w-full rounded-lg bg-green-600 px-6 py-4 text-xl font-semibold text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createGame.isPending ? t("creating") : t("createGame")}
        </button>
        {createGame.error && (
          <p className="text-sm text-red-400 text-center">
            {createGame.error.message}
          </p>
        )}
      </div>

      {/* Join Game */}
      <div className="rounded-lg bg-green-900/50 p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">{t("joinGame")}</h2>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(extractCode(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && handleJoinGame()}
          placeholder={t("enterCode")}
          className="w-full rounded-lg bg-green-950 px-4 py-3 text-center text-2xl font-mono uppercase tracking-widest text-white placeholder:text-sm placeholder:tracking-normal placeholder:normal-case placeholder:font-sans placeholder:text-green-400 outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={handleJoinGame}
          disabled={joinGame.isPending || joinCode.length !== 6}
          className="w-full rounded-lg bg-blue-600 px-6 py-4 text-xl font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {joinGame.isPending ? t("joining") : t("join")}
        </button>
        {joinGame.error && (
          <p className="text-sm text-red-400 text-center">
            {joinGame.error.message}
          </p>
        )}
      </div>

      {/* Show current user */}
      <div className="text-center text-sm text-green-300">
        {session?.user ? (
          <p>{t("playingAs", { name: session.user.name ?? "" })}</p>
        ) : guestName ? (
          <p>
            {t("playingAsGuest", { name: guestName })} •{" "}
            <button
              onClick={() => {
                setGuestName("");
                setShowGuestInput(true);
              }}
              className="underline hover:text-white"
            >
              {t("changeName")}
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}
