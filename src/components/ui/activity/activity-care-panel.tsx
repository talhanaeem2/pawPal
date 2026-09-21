import { Scissors } from "lucide-react";

import { ActivityDashboard } from "./activity-dashboard";
import { ActivityLogButton } from "./activity-log-button";
import { ActivityMetricCards } from "./activity-metric-cards";
import { ActivityTypeLogGroups } from "./activity-type-log-groups";

import { ACTIVITY_ICONS } from "@/lib/activity-utils";

import { ActivityType } from "@/schemas/activity";
import { Pet } from "@/schemas/pets";

type ActivityCarePanelProps = {
  pets: Pet[];
  care: ActivityDashboard["care"];
  careTypes: ActivityType[];
  petNames: Map<string, string>;
  selectedPetId: string;
  onDelete: (id: string) => void;
};

export function ActivityCarePanel({
  pets,
  care,
  careTypes,
  petNames,
  selectedPetId,
  onDelete,
}: ActivityCarePanelProps) {
  const hasCareOptions = careTypes.length > 0;
  const lastCareLog = care.logs[0];
  const daysSinceLastCare = lastCareLog
    ? Math.max(0, Math.floor((Date.now() - new Date(lastCareLog.occurred_at).getTime()) / 86_400_000))
    : null;

  return (
    <div className="space-y-5">
      <ActivityMetricCards metrics={care.cards} />

      {care.breakdown.length > 0 && (
        <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg">This week</h2>
              <p className="mt-1 text-xs text-muted-foreground">Care activity breakdown</p>
            </div>

            {daysSinceLastCare !== null && (
              <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">
                <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
                {daysSinceLastCare === 0
                  ? "Today"
                  : daysSinceLastCare === 1
                    ? "Yesterday"
                    : String(daysSinceLastCare) + "d ago"}
              </div>
            )}
          </div>

          <div className="mt-5 space-y-4">
            {care.breakdown.map((item) => {
              const Icon = ACTIVITY_ICONS[item.type] ?? Scissors;

              return (
                <div key={item.type}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{item.count} this week</span>
                      <span className="text-xs text-muted-foreground/50">·</span>
                      <span className="text-xs text-muted-foreground">{item.total} total</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: (item.count / care.maxBreakdownCount) * 100 + "%",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {care.groupedLogs.length > 0 ? (
        <ActivityTypeLogGroups
          groups={care.groupedLogs}
          petNames={petNames}
          selectedPetId={selectedPetId}
          fallbackIcon={Scissors}
          onDelete={onDelete}
          pets={pets}
        />
      ) : (
        hasCareOptions && (
          <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
              <Scissors className="h-5 w-5 text-primary" />
            </div>

            <h2 className="mt-4 font-display text-lg">No care logged yet</h2>

            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              Keep track of grooming, baths and other care routines for your pet.
            </p>

            <ActivityLogButton pets={pets} label="Log care" className="mt-4 rounded-full" />
          </section>
        )
      )}
    </div>
  );
}