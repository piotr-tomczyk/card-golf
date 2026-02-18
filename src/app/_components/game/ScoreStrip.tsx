"use client";

interface ScoreStripPlayer {
  id: string;
  displayName: string;
  totalScore: number;
  roundScore: number; // live round score from visible cards
  isYou: boolean;
}

interface ScoreStripProps {
  you: ScoreStripPlayer;
  opponent: ScoreStripPlayer;
}

export function ScoreStrip({ you, opponent }: ScoreStripProps) {
  const youLeading = you.totalScore < opponent.totalScore;
  const tied = you.totalScore === opponent.totalScore;

  return (
    <div className="flex items-stretch overflow-hidden rounded-b-lg bg-green-950/90 text-white backdrop-blur-sm ring-1 ring-white/5">
      {/* You */}
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-0 py-1.5 transition-colors ${
          youLeading && !tied
            ? "bg-green-700/40"
            : tied
              ? "bg-green-900/0"
              : "bg-red-900/20"
        }`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-green-400">
          You
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-black tabular-nums leading-none text-white">
            {you.totalScore}
          </span>
          <span className="text-[11px] font-medium tabular-nums text-green-400/80">
            +{you.roundScore}
          </span>
        </div>
      </div>

      {/* Divider with lead indicator */}
      <div className="flex flex-col items-center justify-center px-2 py-1">
        <div className="flex flex-col items-center gap-0.5">
          {!tied && (
            <span
              className={`text-[9px] font-bold uppercase tracking-widest ${
                youLeading ? "text-green-400" : "text-red-400"
              }`}
            >
              {youLeading ? "▲" : "▼"}
            </span>
          )}
          <span className="text-[10px] font-bold text-green-600">vs</span>
          {!tied && (
            <span
              className={`text-[9px] font-bold uppercase tracking-widest ${
                youLeading ? "text-red-400" : "text-green-400"
              }`}
            >
              {youLeading ? "▼" : "▲"}
            </span>
          )}
        </div>
      </div>

      {/* Opponent */}
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-0 py-1.5 transition-colors ${
          !youLeading && !tied
            ? "bg-green-700/40"
            : tied
              ? "bg-green-900/0"
              : "bg-red-900/20"
        }`}
      >
        <span
          className="max-w-[80px] truncate text-[10px] font-semibold uppercase tracking-widest text-green-400"
          title={opponent.displayName}
        >
          {opponent.displayName}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-black tabular-nums leading-none text-white">
            {opponent.totalScore}
          </span>
          <span className="text-[11px] font-medium tabular-nums text-green-400/80">
            +{opponent.roundScore}
          </span>
        </div>
      </div>
    </div>
  );
}
