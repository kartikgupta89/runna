interface StatsRowProps {
  completionRate: number;
  daysUntilRace: number;
  totalWeeks: number;
  currentWeek: number;
}

export function StatsRow({
  completionRate,
  daysUntilRace,
  totalWeeks,
  currentWeek,
}: StatsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-3 px-4 py-4">
      <StatCard
        value={`${Math.round(completionRate * 100)}%`}
        label="Completion"
        subtext="of workouts done"
      />
      <StatCard
        value={currentWeek > totalWeeks ? "Done" : `${currentWeek}/${totalWeeks}`}
        label="Weeks"
        subtext="into your plan"
      />
      <StatCard
        value={daysUntilRace > 0 ? String(daysUntilRace) : "🏁"}
        label={daysUntilRace > 0 ? "Days left" : "Race day!"}
        subtext={daysUntilRace > 0 ? "until race day" : ""}
      />
    </div>
  );
}

function StatCard({
  value,
  label,
  subtext,
}: {
  value: string;
  label: string;
  subtext: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-xs font-medium mt-1">{label}</p>
      {subtext && <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>}
    </div>
  );
}
