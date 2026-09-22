import { Scissors } from "lucide-react";

import { ActivityDashboard } from "./activity-dashboard";
import { ActivityLogButton } from "./activity-log-button";
import { ActivityMetricCards } from "./activity-metric-cards";
import { ActivityTypeLogGroups } from "./activity-type-log-groups";

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

  return (
    <div className="space-y-5">
      {/* <ActivityMetricCards metrics={care.cards} /> */}

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