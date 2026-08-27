import { Activity, Scale } from "lucide-react";

import { ACTIVITY_ICONS, ACTIVITY_LABELS } from "@/lib/activity-utils";
import { formatDate } from "@/lib/utils";

import { ActivityDashboard } from "./activity-dashboard";
import { ActivityLogButton } from "./activity-log-button";
import { ActivityMetricCards } from "./activity-metric-cards";
import { ActivityTypeLogGroups } from "./activity-type-log-groups";
import { ActivityWeightHistory } from "./activity-weight-history";

import { Pet } from "@/schemas/pets";

type ActivityHealthPanelProps = {
  pets: Pet[];
  health: ActivityDashboard["health"];
  petNames: Map<string, string>;
  selectedPetId: string;
  onDelete: (id: string) => void;
};

export function ActivityHealthPanel({
  pets,
  health,
  petNames,
  selectedPetId,
  onDelete,
}: ActivityHealthPanelProps) {
  const healthLogsByType = new Map(health.groupedLogs);
  const hasHealthOptions = health.types.length > 0;

  return (
    <div className="space-y-5">
      <ActivityMetricCards metrics={health.cards} />

      {health.logs.length > 0 && (
        <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg">Health overview</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {health.logs.length} total observation
                {health.logs.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {health.types.map((type) => {
              const typeLogs = healthLogsByType.get(type);

              if (!typeLogs || typeLogs.length === 0) {
                return null;
              }

              const Icon = ACTIVITY_ICONS[type] ?? Activity;
              const lastLog = typeLogs[0];

              return (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-2xl bg-secondary/50 px-4 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-card">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ACTIVITY_LABELS[type] ?? type}</p>
                      <p className="text-xs text-muted-foreground">
                        {typeLogs.length} log
                        {typeLogs.length === 1 ? "" : "s"} · Last {formatDate(lastLog.occurred_at)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {health.latestWeight ? (
        <ActivityWeightHistory
          latestWeight={health.latestWeight}
          selectedPetId={selectedPetId}
          selectedPetWeightLogs={health.selectedPetWeightLogs}
          weightChange={health.weightChange}
          totalWeightChange={health.totalWeightChange}
          weightHistoryCount={health.weightHistoryCount}
          petName={petNames.get(health.latestWeight.pet_id)}
        />
      ) : (
        <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
            <Scale className="h-5 w-5 text-primary" />
          </div>

          <h2 className="mt-4 font-display text-lg">Start tracking weight</h2>

          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            Record your pet&apos;s weight over time to monitor changes and see their growth history.
          </p>

          <ActivityLogButton pets={pets} label="Log weight" className="mt-4 rounded-full" />
        </section>
      )}

      {health.groupedLogs.length > 0 ? (
        <ActivityTypeLogGroups
          groups={health.groupedLogs}
          petNames={petNames}
          selectedPetId={selectedPetId}
          onDelete={onDelete}
          pets={pets}
        />
      ) : (
        hasHealthOptions && (
          <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
              <Activity className="h-5 w-5 text-primary" />
            </div>

            <h2 className="mt-4 font-display text-lg">No health observations yet</h2>

            <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
              Record health observations and measurements to keep a useful history for your pet.
            </p>

            <ActivityLogButton pets={pets} label="Log health" className="mt-4 rounded-full" />
          </section>
        )
      )}
    </div>
  );
}
