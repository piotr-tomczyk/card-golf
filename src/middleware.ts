import { type NextRequest, NextResponse } from "next/server";

const SUPPORTED = ["en", "pl"] as const;
type Locale = (typeof SUPPORTED)[number];

function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return "en";
  // Parse Accept-Language header, e.g. "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7"
  const langs = acceptLanguage
    .split(",")
    .map((entry) => {
      const [lang, q] = entry.trim().split(";q=");
      return { lang: (lang ?? "").trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of langs) {
    const base = lang.split("-")[0] as Locale;
    if (SUPPORTED.includes(base)) return base;
  }
  return "en";
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const existing = request.cookies.get("NEXT_LOCALE")?.value;
  if (existing && SUPPORTED.includes(existing as Locale)) {
    // User already has a valid locale cookie — keep it
    return response;
  }

  // Detect from browser preference and write sticky cookie
  const locale = detectLocale(request.headers.get("accept-language"));
  response.cookies.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)"],
};
