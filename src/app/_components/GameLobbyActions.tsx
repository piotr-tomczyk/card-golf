"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { Session } from "next-auth";

interface GameLobbyActionsProps {
  session: Session | null;
}

export function GameLobbyActions({ session }: GameLobbyActionsProps) {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [showGuestInput, setShowGuestInput] = useState(false);

  // Load guest name from localStorage on mount
  useEffect(() => {
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
    createGame.mutate();
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

  if (!session?.user && showGuestInput && !guestName) {
    return (
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-lg bg-green-900/50 p-6 space-y-4">
          <h2 className="text-2xl font-bold text-center">
            What's your name?
          </h2>
          <p className="text-sm text-green-200 text-center">
            Enter a display name to get started
          </p>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveGuestName()}
            placeholder="Your name"
            maxLength={30}
            className="w-full rounded-lg bg-green-950 px-4 py-3 text-white placeholder-green-400 outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
          <button
            onClick={saveGuestName}
            disabled={!guestName.trim()}
            className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Create Game */}
      <div className="rounded-lg bg-green-900/50 p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">Create New Game</h2>
        <button
          onClick={handleCreateGame}
          disabled={createGame.isPending}
          className="w-full rounded-lg bg-green-600 px-6 py-4 text-xl font-semibold text-white transition hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createGame.isPending ? "Creating..." : "Create Game"}
        </button>
        {createGame.error && (
          <p className="text-sm text-red-400 text-center">
            {createGame.error.message}
          </p>
        )}
      </div>

      {/* Join Game */}
      <div className="rounded-lg bg-green-900/50 p-6 space-y-4">
        <h2 className="text-2xl font-bold text-center">Join Game</h2>
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleJoinGame()}
          placeholder="Enter 6-character code"
          maxLength={6}
          className="w-full rounded-lg bg-green-950 px-4 py-3 text-center text-2xl font-mono uppercase tracking-widest text-white placeholder-green-400 outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          onClick={handleJoinGame}
          disabled={joinGame.isPending || joinCode.length !== 6}
          className="w-full rounded-lg bg-blue-600 px-6 py-4 text-xl font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {joinGame.isPending ? "Joining..." : "Join Game"}
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
          <p>Playing as {session.user.name}</p>
        ) : guestName ? (
          <p>
            Playing as {guestName} (guest) •{" "}
            <button
              onClick={() => {
                setGuestName("");
                setShowGuestInput(true);
              }}
              className="underline hover:text-white"
            >
              Change name
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}
