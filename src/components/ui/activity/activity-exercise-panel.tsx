import { Activity, Flame, Footprints } from "lucide-react";

import { formatMinutes } from "@/lib/activity-utils";
import { cn } from "@/lib/utils";

import { ActivityDashboard } from "./activity-dashboard";
import { ActivityLogButton } from "./activity-log-button";
import { ActivityMetricCards } from "./activity-metric-cards";

import { Pet } from "@/schemas/pets";

type ActivityExercisePanelProps = {
  pets: Pet[];
  exercise: ActivityDashboard["exercise"];
};

export function ActivityExercisePanel({ pets, exercise }: ActivityExercisePanelProps) {
  if (exercise.logs.length === 0) {
    return (
      <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
          <Footprints className="h-5 w-5 text-primary" />
        </div>

        <h2 className="mt-4 font-display text-lg">No exercise this week</h2>

        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Log a walk, run, play session or other exercise to start seeing your pet&apos;s weekly
          progress.
        </p>

        <ActivityLogButton pets={pets} label="Log exercise" className="mt-4 rounded-full" />
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <ActivityMetricCards metrics={exercise.cards} />

      {exercise.change !== null && (
        <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg">Weekly progress</h2>
              <p className="mt-1 text-xs text-muted-foreground">Compared with last week</p>
            </div>

            <div
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                exercise.change > 0
                  ? "bg-green-100 text-green-700"
                  : exercise.change < 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              {exercise.change > 0 ? "+" : ""}
              {exercise.change.toFixed(0)}%
            </div>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold">{formatMinutes(exercise.minutes)}</p>
              <p className="text-xs text-muted-foreground">This week</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-medium">{formatMinutes(exercise.previousWeekMinutes)}</p>
              <p className="text-xs text-muted-foreground">Last week</p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg">This week</h2>
            <p className="mt-1 text-xs text-muted-foreground">Your activity breakdown</p>
          </div>
          {exercise.streak > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">
              <Flame className="h-3.5 w-3.5 text-red-500" />
              {exercise.streak} day streak
            </div>
          )}
        </div>

        <div className="mt-5 space-y-4">
          {exercise.breakdown.map((item) => (
            <div key={item.type}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: (item.count / exercise.maxBreakdownCount) * 100 + "%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {exercise.insight && (
        <section className="rounded-3xl border border-primary/10 bg-primary/5 p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">{exercise.insight.title}</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{exercise.insight.text}</p>
        </section>
      )}
    </div>
  );
}
