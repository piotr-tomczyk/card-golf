import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";
import { GameLobbyActions } from "@/app/_components/GameLobbyActions";
import { getTranslations } from "next-intl/server";
import { HowToPlay } from "@/app/_components/HowToPlay";

export default async function Home() {
  const session = await auth();
  const t = await getTranslations("Home");

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-800 to-green-950 text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <div className="text-center">
            <h1 className="text-6xl font-extrabold tracking-tight sm:text-7xl mb-4">
              {t("title")}
            </h1>
            <p className="text-xl text-green-200">
              {t("subtitle")}
            </p>
          </div>

          <GameLobbyActions session={session} />

          <HowToPlay />

          {!session?.user && (
            <div className="text-center text-sm text-green-300">
              <p>{t("guestNote")}</p>
              <p className="mt-2">
                <a
                  href="/api/auth/signin"
                  className="underline hover:text-white"
                >
                  {t("signIn")}
                </a>{" "}
                {t("saveStats")}
              </p>
            </div>
          )}
        </div>
      </main>
    </HydrateClient>
  );
}
