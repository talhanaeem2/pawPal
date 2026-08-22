import { Activity as ActivityIcon, type LucideIcon } from "lucide-react";

import { ACTIVITY_ICONS, ACTIVITY_LABELS } from "@/lib/activity-utils";
import { formatDate } from "@/lib/utils";
import { ActivityLog } from "@/schemas/activity";

type ActivityTypeLogGroupsProps = {
  groups: [string, ActivityLog[]][];
  petNames: Map<string, string>;
  selectedPetId: string;
  fallbackIcon?: LucideIcon;
};

export function ActivityTypeLogGroups({
  groups,
  petNames,
  selectedPetId,
  fallbackIcon = ActivityIcon,
}: ActivityTypeLogGroupsProps) {
  return (
    <div className="space-y-4">
      {groups.map(([type, logs]) => {
        const Icon = ACTIVITY_ICONS[type] ?? fallbackIcon;
        const label = ACTIVITY_LABELS[type] ?? type;

        return (
          <section key={type} className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg">{label}</h2>

                  <p className="text-xs text-muted-foreground">
                    {selectedPetId !== "all" ? "Recent " + label + " sessions" : label + " logs"}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {logs.length} {logs.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            <ul className="divide-y divide-border/60">
              {logs.slice(0, 5).map((log) => (
                <li key={log.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {petNames.get(log.pet_id) ?? "Pet"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(log.occurred_at)}
                      {log.notes && " · " + log.notes}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
