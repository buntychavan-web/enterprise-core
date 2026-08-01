export function RatingBadge({
  rating,
  scaleMax,
  size = "md",
}: {
  rating?: number | null;
  scaleMax?: number;
  size?: "sm" | "md";
}) {
  if (rating === undefined || rating === null) {
    return <span className="text-sm text-muted-foreground">Not rated</span>;
  }
  return (
    <span
      className={
        size === "sm"
          ? "inline-flex items-baseline gap-0.5 text-sm font-semibold tabular-nums text-foreground"
          : "inline-flex items-baseline gap-1 text-2xl font-semibold tabular-nums text-foreground"
      }
    >
      {rating.toFixed(1)}
      {scaleMax !== undefined && (
        <span className="text-xs font-normal text-muted-foreground">/ {scaleMax}</span>
      )}
    </span>
  );
}
