import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";
import { GameLobbyActions } from "@/app/_components/GameLobbyActions";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-800 to-green-950 text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <div className="text-center">
            <h1 className="text-6xl font-extrabold tracking-tight sm:text-7xl mb-4">
              Card Golf
            </h1>
            <p className="text-xl text-green-200">
              A fun multiplayer card game
            </p>
          </div>

          <GameLobbyActions session={session} />

          {!session?.user && (
            <div className="text-center text-sm text-green-300">
              <p>Playing as a guest? Your name will be stored locally.</p>
              <p className="mt-2">
                <a
                  href="/api/auth/signin"
                  className="underline hover:text-white"
                >
                  Sign in with Discord
                </a>{" "}
                to save your stats
              </p>
            </div>
          )}
        </div>
      </main>
    </HydrateClient>
  );
}
