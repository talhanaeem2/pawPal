import { cn } from "@/lib/utils";

import { MetricCard } from "./activity-dashboard";

type ActivityMetricCardsProps = {
  metrics: MetricCard[];
};

export function ActivityMetricCards({ metrics }: ActivityMetricCardsProps) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <section className={cn("grid gap-2", metrics.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <div key={metric.label} className="rounded-2xl bg-card p-4 shadow-(--shadow-soft)">
            <Icon className="h-4 w-4 text-primary" />
            <div className="mt-3 text-xl font-semibold">{metric.value}</div>
            <p className="text-xs text-muted-foreground">{metric.label}</p>
          </div>
        );
      })}
    </section>
  );
}
