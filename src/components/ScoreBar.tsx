// ---------------------------------------------------------------------------
// ScoreBar – horizontal progress bar for scores (0-5 range)
// ---------------------------------------------------------------------------

interface Props {
  label: string;
  score: number;
  max?: number;
}

export function ScoreBar({ label, score, max = 5 }: Props) {
  const pct = Math.min(Math.max((score / max) * 100, 0), 100);

  const color =
    pct >= 80
      ? "bg-emerald-500"
      : pct >= 60
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
          {score.toFixed(1)}
          <span className="text-zinc-400 font-normal">/{max}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
