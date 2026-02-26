"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

// ─── Mini card primitives ─────────────────────────────────────────────────────

type Suit = "H" | "D" | "S" | "C";
const SUIT_SYM: Record<Suit, string> = { H: "♥", D: "♦", S: "♠", C: "♣" };

function MiniCard({
  rank,
  suit,
  faceDown = false,
  matched = false,
  matchType = "column",
}: {
  rank?: string;
  suit?: Suit;
  faceDown?: boolean;
  matched?: boolean;
  matchType?: "column" | "row" | "diagonal" | "square";
}) {
  const isRed = suit === "H" || suit === "D";
  if (faceDown) {
    return (
      <div
        className="h-[2.4rem] w-[1.7rem] flex-shrink-0 rounded border border-blue-400/20 bg-blue-950 shadow-inner"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg,rgba(255,255,255,0.045) 0,rgba(255,255,255,0.045) 1px,transparent 1px,transparent 5px)",
        }}
      />
    );
  }

  const matchedClass = matched
    ? matchType === "column"
      ? "border border-sky-400 bg-sky-50 shadow-[0_0_6px_1px_rgba(125,211,252,0.55)]"
      : matchType === "row"
        ? "border border-amber-400 bg-amber-50 shadow-[0_0_6px_1px_rgba(251,191,36,0.55)]"
        : matchType === "diagonal"
          ? "border border-violet-400 bg-violet-50 shadow-[0_0_6px_1px_rgba(196,132,252,0.55)]"
          : "border border-emerald-400 bg-emerald-50 shadow-[0_0_6px_1px_rgba(52,211,153,0.55)]"
    : "border border-neutral-300 bg-white";

  return (
    <div
      className={[
        "relative h-[2.4rem] w-[1.7rem] flex-shrink-0 rounded flex flex-col p-[2px] leading-none shadow",
        matchedClass,
      ].join(" ")}
    >
      <span
        className={`text-[7.5px] font-black ${isRed ? "text-red-600" : "text-gray-900"}`}
      >
        {rank}
      </span>
      <span className={`text-[8px] ${isRed ? "text-red-600" : "text-gray-900"}`}>
        {suit ? SUIT_SYM[suit] : ""}
      </span>
      {/* bottom-right mirror */}
      <span
        className={`absolute bottom-[2px] right-[2px] text-[7.5px] font-black rotate-180 ${isRed ? "text-red-600" : "text-gray-900"}`}
      >
        {rank}
      </span>
    </div>
  );
}

function MiniGrid({
  cards,
  cols = 3,
}: {
  cards: Array<{ rank?: string; suit?: Suit; faceDown?: boolean; matched?: boolean; matchType?: "column" | "row" | "diagonal" | "square" }>;
  cols?: number;
}) {
  return (
    <div
      className="inline-grid gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${cols}, auto)` }}
    >
      {cards.map((c, i) => (
        <MiniCard key={i} {...c} />
      ))}
    </div>
  );
}

// ─── Card value pill ──────────────────────────────────────────────────────────

function ValuePill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "green" | "red" | "amber" | "white";
}) {
  const colors: Record<string, string> = {
    green: "bg-green-700/60 border-green-500/40 text-green-200",
    red: "bg-red-900/60 border-red-500/40 text-red-300",
    amber: "bg-amber-900/60 border-amber-500/40 text-amber-300",
    white: "bg-green-900/60 border-green-600/30 text-green-100",
  };
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 ${colors[accent]}`}
    >
      <span className="font-mono text-sm font-bold">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

// ─── Rule section ─────────────────────────────────────────────────────────────

function Rule({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative border-l-2 border-amber-700/40 pl-5 space-y-3">
      <h3
        className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-wide text-amber-400"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        <span className="text-base leading-none">{icon}</span>
        {title}
      </h3>
      <div className="space-y-3 text-sm text-green-200/90 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

// ─── Shared rules sections (same for both variants) ───────────────────────────

function SharedTurnRules({ t }: { t: ReturnType<typeof useTranslations<"HowToPlay">> }) {
  return (
    <Rule icon="↩️" title={t("turnTitle")}>
      <p>{t("turnIntro")}</p>

      <div className="space-y-3 pt-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:space-y-0">
        {/* Draw */}
        <div className="rounded-lg bg-green-900/40 p-3 space-y-1.5">
          <p className="font-semibold text-white text-xs uppercase tracking-wider">
            1 · {t("drawTitle")}
          </p>
          <p className="text-green-300">{t("drawBody")}</p>
          <div className="flex flex-wrap items-end justify-center gap-x-1.5 gap-y-2 pt-1">
            {/* Deck */}
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <div className="relative">
                <div className="absolute top-[2px] left-[2px] h-[2.4rem] w-[1.7rem] rounded bg-blue-800/60" />
                <MiniCard faceDown />
              </div>
              <span className="text-[9px] text-green-500">{t("deckLabel")}</span>
            </div>
            <span className="text-green-500 text-xs flex-shrink-0 mb-2">→</span>
            {/* Drawn */}
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <MiniCard rank="Q" suit="H" />
              <span className="text-[9px] text-green-500">{t("drawnLabel")}</span>
            </div>
            <span className="text-green-500 text-xs flex-shrink-0 mb-2">→</span>
            {/* Swap */}
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <div className="flex items-center gap-0.5">
                <MiniCard rank="Q" suit="H" />
                <span className="text-[9px] text-green-400">↕</span>
                <MiniCard rank="5" suit="S" />
              </div>
              <span className="text-[9px] text-green-500">{t("swapLabel")}</span>
            </div>
            <span className="text-green-600 text-[10px] flex-shrink-0 mb-2">{t("orLabel")}</span>
            {/* Discard */}
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
              <MiniCard rank="Q" suit="H" />
              <span className="text-[9px] text-green-500">{t("discardLabel")}</span>
            </div>
          </div>
        </div>

        {/* Take from discard */}
        <div className="rounded-lg bg-green-900/40 p-3 space-y-1.5">
          <p className="font-semibold text-white text-xs uppercase tracking-wider">
            2 · {t("takeTitle")}
          </p>
          <p className="text-green-300">{t("takeBody")}</p>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex flex-col items-center gap-0.5">
              <MiniCard rank="J" suit="D" />
              <span className="text-[9px] text-green-500">{t("discardLabel")}</span>
            </div>
            <span className="text-green-500 text-xs">→</span>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <MiniCard rank="J" suit="D" />
                <span className="text-[9px] text-green-400">↕</span>
                <MiniCard rank="9" suit="C" />
              </div>
              <span className="text-[9px] text-green-500">{t("swapLabel")}</span>
            </div>
          </div>
        </div>

        {/* Flip */}
        <div className="rounded-lg bg-green-900/40 p-3 space-y-1.5">
          <p className="font-semibold text-white text-xs uppercase tracking-wider">
            3 · {t("flipTitle")}
          </p>
          <p className="text-green-300">{t("flipBody")}</p>
          <div className="flex items-center gap-3 pt-1">
            <MiniCard faceDown />
            <span className="text-green-500 text-xs">→</span>
            <MiniCard rank="K" suit="S" />
            <span className="text-[9px] italic text-green-500">{t("fullTurnNote")}</span>
          </div>
        </div>
      </div>
    </Rule>
  );
}

function SharedValuesAndEnd({ t, variant }: { t: ReturnType<typeof useTranslations<"HowToPlay">>; variant: "classic" | "nine-card" }) {
  const isNineCard = variant === "nine-card";
  return (
    <>
      {/* CARD VALUES */}
      <Rule icon="🎯" title={t("valuesTitle")}>
        <div className="grid grid-cols-2 gap-2">
          <ValuePill label="K" value={t("valuesKing")} accent="green" />
          <ValuePill label="2" value={t("valuesTwo")} accent="red" />
          <ValuePill label="A" value={t("valuesAce")} accent="white" />
          <ValuePill label="J  Q  10" value={t("valuesFace")} accent="amber" />
        </div>
        <p className="text-xs italic text-green-500">{t("valuesOther")}</p>
      </Rule>

      {/* ROUND END */}
      <Rule icon="⏳" title={t("endTitle")}>
        <p>{t("endBody")}</p>
        <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-700/30 bg-amber-950/30 px-4 py-3">
          <MiniGrid
            cols={3}
            cards={isNineCard ? [
              { rank: "A", suit: "S" },
              { rank: "K", suit: "H" },
              { rank: "7", suit: "D" },
              { rank: "2", suit: "C" },
              { rank: "J", suit: "H" },
              { rank: "9", suit: "S" },
              { rank: "4", suit: "D" },
              { rank: "6", suit: "C" },
              { rank: "3", suit: "H" },
            ] : [
              { rank: "A", suit: "S" },
              { rank: "K", suit: "H" },
              { rank: "7", suit: "D" },
              { rank: "2", suit: "C" },
              { rank: "J", suit: "H" },
              { rank: "9", suit: "S" },
            ]}
          />
          <span className="text-xl text-amber-500">→</span>
          <p className="text-xs text-amber-300 max-w-[100px]">{t("endTriggerNote")}</p>
        </div>
      </Rule>

      {/* WINNING */}
      <Rule icon="🥇" title={t("winTitle")}>
        <p>{t("winBody")}</p>
      </Rule>
    </>
  );
}

// ─── Classic rules content ────────────────────────────────────────────────────

function ClassicRules({ t }: { t: ReturnType<typeof useTranslations<"HowToPlay">> }) {
  return (
    <>
      {/* GOAL */}
      <Rule icon="🏆" title={t("goalTitle")}>
        <p>{t("goalBody")}</p>
      </Rule>

      {/* SETUP */}
      <Rule icon="🃏" title={t("setupTitle")}>
        <p>{t("setupBody")}</p>
        <div className="flex flex-col items-center gap-2 pt-1">
          <MiniGrid
            cols={3}
            cards={[
              { rank: "7", suit: "S" },
              { faceDown: true },
              { faceDown: true },
              { rank: "3", suit: "H" },
              { faceDown: true },
              { faceDown: true },
            ]}
          />
          <p className="text-[10px] italic text-green-500">{t("setupGridLabel")}</p>
        </div>
      </Rule>

      {/* TURN */}
      <SharedTurnRules t={t} />

      {/* COLUMN MATCH - classic */}
      <Rule icon="✨" title={t("matchTitle")}>
        <p>{t("matchBody")}</p>
        <div className="flex items-start justify-center gap-8 pt-2">
          {/* Normal column */}
          <div className="flex flex-col items-center gap-1.5">
            <MiniGrid
              cols={1}
              cards={[
                { rank: "Q", suit: "H" },
                { rank: "3", suit: "S" },
              ]}
            />
            <p className="text-[10px] text-green-500 italic">{t("matchBefore")}</p>
            <span className="rounded bg-red-900/50 px-2 py-0.5 text-[11px] font-bold text-red-300">
              13 {t("ptsLabel")}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center self-center">
            <span className="text-xl text-amber-700/70">vs</span>
          </div>

          {/* Matched column */}
          <div className="flex flex-col items-center gap-1.5">
            <MiniGrid
              cols={1}
              cards={[
                { rank: "7", suit: "D", matched: true, matchType: "column" },
                { rank: "7", suit: "C", matched: true, matchType: "column" },
              ]}
            />
            <p className="text-[10px] text-sky-400 italic">{t("matchAfter")}</p>
            <span className="rounded bg-sky-900/50 px-2 py-0.5 text-[11px] font-bold text-sky-300">
              0 {t("ptsLabel")} ✓
            </span>
          </div>
        </div>
      </Rule>

      <SharedValuesAndEnd t={t} variant="classic" />
    </>
  );
}

// ─── Nine-Card rules content ──────────────────────────────────────────────────

function NineCardRules({ t }: { t: ReturnType<typeof useTranslations<"HowToPlay">> }) {
  return (
    <>
      {/* GOAL */}
      <Rule icon="🏆" title={t("goalTitle")}>
        <p>{t("goalBody")}</p>
      </Rule>

      {/* SETUP (9-card specific) */}
      <Rule icon="🃏" title={t("setupTitle")}>
        <p>{t("setupBody9")}</p>
        <div className="flex flex-col items-center gap-2 pt-1">
          <MiniGrid
            cols={3}
            cards={[
              { rank: "7", suit: "S" },
              { faceDown: true },
              { faceDown: true },
              { rank: "3", suit: "H" },
              { faceDown: true },
              { faceDown: true },
              { faceDown: true },
              { faceDown: true },
              { faceDown: true },
            ]}
          />
          <p className="text-[10px] italic text-green-500">{t("setupGridLabel9")}</p>
        </div>
      </Rule>

      {/* TURN (same as classic) */}
      <SharedTurnRules t={t} />

      {/* LINES MATCH (9-card specific) */}
      <Rule icon="✨" title={t("matchTitle9")}>
        <p>{t("matchBody9")}</p>
        <div className="flex flex-wrap items-start justify-center gap-5 pt-2">
          {/* Column example */}
          <div className="flex flex-col items-center gap-1.5">
            <MiniGrid
              cols={3}
              cards={[
                { rank: "7", suit: "S", matched: true, matchType: "column" },
                { rank: "K", suit: "H" },
                { rank: "2", suit: "C" },
                { rank: "7", suit: "D", matched: true, matchType: "column" },
                { rank: "J", suit: "S" },
                { rank: "9", suit: "H" },
                { rank: "7", suit: "C", matched: true, matchType: "column" },
                { rank: "4", suit: "D" },
                { rank: "A", suit: "S" },
              ]}
            />
            <p className="text-[10px] text-sky-400 italic">{t("matchVerticalLabel")}</p>
            <span className="rounded bg-sky-900/50 px-2 py-0.5 text-[11px] font-bold text-sky-300">
              0 {t("ptsLabel")} ✓
            </span>
          </div>

          {/* Row example */}
          <div className="flex flex-col items-center gap-1.5">
            <MiniGrid
              cols={3}
              cards={[
                { rank: "Q", suit: "S", matched: true, matchType: "row" },
                { rank: "Q", suit: "H", matched: true, matchType: "row" },
                { rank: "Q", suit: "D", matched: true, matchType: "row" },
                { rank: "K", suit: "C" },
                { rank: "5", suit: "S" },
                { rank: "9", suit: "H" },
                { rank: "2", suit: "D" },
                { rank: "J", suit: "C" },
                { rank: "A", suit: "S" },
              ]}
            />
            <p className="text-[10px] text-amber-400 italic">{t("matchHorizontalLabel")}</p>
            <span className="rounded bg-amber-900/50 px-2 py-0.5 text-[11px] font-bold text-amber-300">
              0 {t("ptsLabel")} ✓
            </span>
          </div>

          {/* Diagonal example */}
          <div className="flex flex-col items-center gap-1.5">
            <MiniGrid
              cols={3}
              cards={[
                { rank: "5", suit: "S", matched: true, matchType: "diagonal" },
                { rank: "K", suit: "H" },
                { rank: "2", suit: "C" },
                { rank: "J", suit: "D" },
                { rank: "5", suit: "C", matched: true, matchType: "diagonal" },
                { rank: "9", suit: "H" },
                { rank: "4", suit: "D" },
                { rank: "A", suit: "S" },
                { rank: "5", suit: "H", matched: true, matchType: "diagonal" },
              ]}
            />
            <p className="text-[10px] text-violet-400 italic">{t("matchDiagonalLabel")}</p>
            <span className="rounded bg-violet-900/50 px-2 py-0.5 text-[11px] font-bold text-violet-300">
              0 {t("ptsLabel")} ✓
            </span>
          </div>
        </div>
      </Rule>

      {/* SQUARE BONUS */}
      <Rule icon="🟩" title={t("squareTitle")}>
        <p>{t("squareBody")}</p>
        <div className="flex flex-wrap items-start justify-center gap-6 pt-2">
          {/* Square example */}
          <div className="flex flex-col items-center gap-1.5">
            <MiniGrid
              cols={3}
              cards={[
                { rank: "6", suit: "S", matched: true, matchType: "square" },
                { rank: "6", suit: "H", matched: true, matchType: "square" },
                { rank: "3", suit: "D" },
                { rank: "6", suit: "C", matched: true, matchType: "square" },
                { rank: "6", suit: "D", matched: true, matchType: "square" },
                { rank: "J", suit: "S" },
                { rank: "9", suit: "H" },
                { rank: "2", suit: "C" },
                { rank: "A", suit: "D" },
              ]}
            />
            <p className="text-[10px] text-emerald-400 italic">{t("squareLabel")}</p>
            <span className="rounded bg-emerald-900/50 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
              −6 {t("ptsLabel")} {t("squareTotalLabel")} ✓
            </span>
          </div>

          {/* Explanation */}
          <div className="flex flex-col justify-center gap-2 text-xs text-green-300 max-w-[140px]">
            <p>{t("squareExamples")}</p>
          </div>
        </div>
      </Rule>

      <SharedValuesAndEnd t={t} variant="nine-card" />
    </>
  );
}

// ─── Power Cards section ──────────────────────────────────────────────────────

function MiniJokerCard({ color }: { color: "red" | "black" }) {
  return (
    <div
      className={`h-[2.4rem] w-[1.7rem] flex-shrink-0 rounded flex items-center justify-center text-sm font-bold shadow border ${
        color === "red"
          ? "bg-red-950 border-red-500/40 text-red-400"
          : "bg-neutral-900 border-neutral-600/40 text-neutral-300"
      }`}
    >
      ★
    </div>
  );
}

function PowerCardsSection({
  t,
  hasJokers,
}: {
  t: ReturnType<typeof useTranslations<"HowToPlay">>;
  hasJokers: boolean;
}) {
  const abilities: Array<{
    card: React.ReactNode;
    title: string;
    body: string;
  }> = [
    {
      card: <MiniCard rank="J" suit="H" />,
      title: t("jackTitle"),
      body: t("jackBody"),
    },
    {
      card: <MiniCard rank="Q" suit="S" />,
      title: t("queenTitle"),
      body: t("queenBody"),
    },
    {
      card: <MiniCard rank="K" suit="C" />,
      title: t("kingTitle"),
      body: t("kingBody"),
    },
    ...(hasJokers
      ? [
          {
            card: <MiniJokerCard color="red" />,
            title: t("jokerAbilityTitle"),
            body: t("jokerAbilityBody"),
          },
        ]
      : []),
  ];

  return (
    <div className="rounded-xl border border-violet-700/30 bg-violet-950/20 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">⚡</span>
        <h3
          className="text-[0.95rem] font-semibold tracking-wide text-violet-300"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          {t("powerCardsTitle")}
        </h3>
        <span className="ml-auto rounded-full border border-violet-600/40 bg-violet-900/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400">
          {t("activeBadge")}
        </span>
      </div>
      <p className="text-sm text-green-200/90 leading-relaxed">{t("powerCardsIntro")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {abilities.map((ability, i) => (
          <div key={i} className="flex gap-2.5 rounded-lg bg-green-900/40 p-3">
            <div className="flex-shrink-0">{ability.card}</div>
            <div>
              <p className="text-[11px] font-semibold text-violet-300 mb-0.5">{ability.title}</p>
              <p className="text-xs text-green-300 leading-relaxed">{ability.body}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs italic text-green-500">{t("powerCardsNote")}</p>
    </div>
  );
}

// ─── Jokers section ───────────────────────────────────────────────────────────

function JokersSection({
  t,
  singleScore = 15,
  pairScore = -5,
}: {
  t: ReturnType<typeof useTranslations<"HowToPlay">>;
  singleScore?: number;
  pairScore?: number;
}) {
  const singleIsGood = singleScore < 0;
  const pairIsGood = pairScore < 0;

  return (
    <div className="rounded-xl border border-amber-700/30 bg-amber-950/10 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">★</span>
        <h3
          className="text-[0.95rem] font-semibold tracking-wide text-amber-300"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          {t("jokersTitle")}
        </h3>
        <span className="ml-auto rounded-full border border-amber-600/40 bg-amber-900/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-500">
          {t("activeBadge")}
        </span>
      </div>
      <p className="text-sm text-green-200/90 leading-relaxed">{t("jokersIntro")}</p>
      <div className="grid grid-cols-2 gap-3">
        {/* Single Joker */}
        <div
          className={`rounded-lg border p-3 flex flex-col items-center gap-2 text-center ${
            singleIsGood
              ? "border-emerald-800/30 bg-emerald-950/30"
              : "border-red-800/30 bg-red-950/20"
          }`}
        >
          <MiniJokerCard color="red" />
          <p className="text-[10px] font-semibold text-green-400">{t("jokerSingleLabel")}</p>
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-bold ${
              singleIsGood
                ? "bg-emerald-900/50 text-emerald-300"
                : "bg-red-900/50 text-red-300"
            }`}
          >
            {t("jokerSinglePts", { score: singleScore })}
          </span>
        </div>
        {/* Joker pair */}
        <div
          className={`rounded-lg border p-3 flex flex-col items-center gap-2 text-center ${
            pairIsGood
              ? "border-emerald-800/30 bg-emerald-950/30"
              : "border-red-800/30 bg-red-950/20"
          }`}
        >
          <div className="flex gap-1">
            <MiniJokerCard color="red" />
            <MiniJokerCard color="black" />
          </div>
          <p className="text-[10px] font-semibold text-green-400">{t("jokerPairLabel")}</p>
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-bold ${
              pairIsGood
                ? "bg-emerald-900/50 text-emerald-300"
                : "bg-red-900/50 text-red-300"
            }`}
          >
            {t("jokerPairPts", { score: pairScore })}
          </span>
        </div>
      </div>
      <p className="text-xs italic text-green-500">{t("jokerPairBody")}</p>
    </div>
  );
}

// ─── Modal content ────────────────────────────────────────────────────────────

function HowToPlayModal({
  onClose,
  defaultVariant = "classic",
  showTabs = false,
  specialAbilities = false,
  includeJokers = false,
  jokerSingleScore = 15,
  jokerPairScore = -5,
}: {
  onClose: () => void;
  defaultVariant?: "classic" | "nine-card";
  showTabs?: boolean;
  specialAbilities?: boolean;
  includeJokers?: boolean;
  jokerSingleScore?: number;
  jokerPairScore?: number;
}) {
  const t = useTranslations("HowToPlay");
  const [activeVariant, setActiveVariant] = useState<"classic" | "nine-card">(defaultVariant);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      className="backdrop-enter fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.78)" }}
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className={`${playfair.variable} modal-enter relative w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-amber-900/30 bg-green-950 shadow-[0_0_80px_-10px_rgba(0,0,0,0.9)]`}
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(255,255,255,0.012) 24px,rgba(255,255,255,0.012) 25px), repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(255,255,255,0.012) 24px,rgba(255,255,255,0.012) 25px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header with close button */}
        <div className="sticky top-0 z-10 border-b border-amber-800/25 bg-green-950/95 backdrop-blur-md px-6 py-4 text-center">
          {/* drag pill for mobile sheet feel */}
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-green-700/60 sm:hidden" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-green-700/50 bg-green-900/80 text-sm text-green-400 transition hover:border-amber-500/60 hover:bg-green-800 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            aria-label={t("close")}
          >
            ✕
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">
            ♠ ♥ ♦ ♣
          </p>
          <h2
            className="mt-1 text-2xl font-bold text-amber-300"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            {t("title")}
          </h2>
          {showTabs ? (
            /* Tab toggle for homepage */
            <div className="mt-3 flex justify-center gap-1 rounded-lg bg-green-900/50 p-1 mx-auto w-fit">
              <button
                onClick={() => setActiveVariant("classic")}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                  activeVariant === "classic"
                    ? "bg-amber-600 text-white shadow"
                    : "text-green-400 hover:text-green-200"
                }`}
              >
                {t("classicTab")}
              </button>
              <button
                onClick={() => setActiveVariant("nine-card")}
                className={`rounded-md px-4 py-1.5 text-xs font-semibold transition ${
                  activeVariant === "nine-card"
                    ? "bg-amber-600 text-white shadow"
                    : "text-green-400 hover:text-green-200"
                }`}
              >
                {t("nineCardTab")}
              </button>
            </div>
          ) : (
            <p className="mt-0.5 text-xs italic text-green-500">
              {activeVariant === "nine-card" ? t("nineCardSubtitle") : t("subtitle")}
            </p>
          )}
          {/* Active variant badges */}
          {(specialAbilities || includeJokers) && (
            <div className="mt-2 flex justify-center gap-1.5 flex-wrap">
              {specialAbilities && (
                <span className="rounded-full border border-violet-600/50 bg-violet-900/40 px-2.5 py-0.5 text-[10px] font-semibold text-violet-300">
                  ⚡ {t("powerCardsTitle")}
                </span>
              )}
              {includeJokers && (
                <span className="rounded-full border border-amber-600/50 bg-amber-900/40 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  ★ {t("jokersTitle")}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Rules content */}
        <div className="px-6 py-7 space-y-7">
          {activeVariant === "nine-card" ? (
            <NineCardRules t={t} />
          ) : (
            <ClassicRules t={t} />
          )}

          {/* Add-on variant sections */}
          {(specialAbilities || includeJokers) && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-amber-700/30" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600/70">
                  {t("variantRules")}
                </span>
                <div className="flex-1 border-t border-amber-700/30" />
              </div>
              {specialAbilities && (
                <PowerCardsSection t={t} hasJokers={includeJokers} />
              )}
              {includeJokers && (
                <JokersSection
                  t={t}
                  singleScore={jokerSingleScore}
                  pairScore={jokerPairScore}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-amber-900/20 px-6 py-4 text-center">
          <p className="text-[10px] text-green-700">♠ ♥ ♦ ♣</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HowToPlay({
  compact = false,
  variant = "classic",
  specialAbilities = false,
  includeJokers = false,
  jokerSingleScore = 15,
  jokerPairScore = -5,
}: {
  compact?: boolean;
  variant?: "classic" | "nine-card";
  specialAbilities?: boolean;
  includeJokers?: boolean;
  jokerSingleScore?: number;
  jokerPairScore?: number;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("HowToPlay");
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      {compact ? (
        /* In-game trigger: small circular button */
        <button
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-green-600/50 bg-green-900/60 text-sm font-bold text-green-300 transition hover:border-amber-500/60 hover:bg-green-800/80 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          aria-label={t("toggle")}
          title={t("toggle")}
        >
          ?
        </button>
      ) : (
        /* Homepage trigger: text button */
        <button
          onClick={() => setOpen(true)}
          className="group mx-auto flex items-center gap-2 rounded-full border border-green-600/50 bg-green-900/40 px-5 py-2 text-sm font-medium text-green-300 transition-all hover:border-amber-500/50 hover:bg-green-900/70 hover:text-amber-300"
        >
          <span className="text-base leading-none transition-transform group-hover:scale-110">
            🃏
          </span>
          {t("toggle")}
        </button>
      )}

      {open && (
        <HowToPlayModal
          onClose={close}
          defaultVariant={variant}
          showTabs={!compact}
          specialAbilities={specialAbilities}
          includeJokers={includeJokers}
          jokerSingleScore={jokerSingleScore}
          jokerPairScore={jokerPairScore}
        />
      )}
    </>
  );
}
