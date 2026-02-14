import { redirect } from "next/navigation";
import { api, HydrateClient } from "@/trpc/server";
import { auth } from "@/server/auth";
import { GameBoard } from "@/app/_components/game/GameBoard";

interface GamePageProps {
  params: Promise<{ code: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { code } = await params;
  const session = await auth();

  // Validate code format (6 uppercase alphanumeric)
  if (!code || code.length !== 6 || !/^[A-Z0-9]+$/.test(code)) {
    redirect("/");
  }

  // For authenticated users, we can prefetch the game on the server
  // For guests, we skip server-side fetching since guest credentials are in localStorage
  let initialGame;
  if (session?.user) {
    try {
      initialGame = await api.game.getByCode({ code });
      if (initialGame) {
        void api.game.getByCode.prefetch({ code });
      }
    } catch (error) {
      // Game not found or error fetching - let client handle it
      console.log("Server-side game fetch failed:", error);
    }
  }

  return (
    <HydrateClient>
      <GameBoard code={code} userId={session?.user?.id} initialGame={initialGame} />
    </HydrateClient>
  );
}
