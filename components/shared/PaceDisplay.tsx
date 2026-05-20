import { formatPace, secPerKmToSecPerMile } from "@/lib/training/paces";

interface PaceDisplayProps {
  secPerKm: number;
  units?: "metric" | "imperial";
  label?: string;
  className?: string;
}

export function PaceDisplay({ secPerKm, units = "metric", label, className }: PaceDisplayProps) {
  const pace =
    units === "imperial"
      ? formatPace(secPerKmToSecPerMile(secPerKm))
      : formatPace(secPerKm);
  const unitLabel = units === "imperial" ? "/mi" : "/km";

  return (
    <span className={className}>
      {label && <span className="text-muted-foreground text-xs mr-1">{label}</span>}
      <span className="font-mono font-semibold">{pace}</span>
      <span className="text-muted-foreground text-xs ml-0.5">{unitLabel}</span>
    </span>
  );
}

interface PaceRangeDisplayProps {
  minSecPerKm: number;
  maxSecPerKm: number;
  units?: "metric" | "imperial";
  className?: string;
}

export function PaceRangeDisplay({
  minSecPerKm,
  maxSecPerKm,
  units = "metric",
  className,
}: PaceRangeDisplayProps) {
  const convert = units === "imperial" ? secPerKmToSecPerMile : (x: number) => x;
  const unitLabel = units === "imperial" ? "/mi" : "/km";

  return (
    <span className={className}>
      <span className="font-mono font-semibold">
        {formatPace(convert(minSecPerKm))}–{formatPace(convert(maxSecPerKm))}
      </span>
      <span className="text-muted-foreground text-xs ml-0.5">{unitLabel}</span>
    </span>
  );
}
