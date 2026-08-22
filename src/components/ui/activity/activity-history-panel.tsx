import { Clock3 } from "lucide-react";

import { Button } from "@/components/ui/common/button";
import {
  ACTIVITY_TIME_FILTERS,
  CATEGORY_FILTERS,
  formatGroupDate,
  getTypeFilters,
} from "@/lib/activity-utils";
import { cn } from "@/lib/utils";

import { ActivityEditButton } from "./activity-edit-button";
import { ActivityLogButton } from "./activity-log-button";
import { ActivityRow } from "./activity-row";

import { Pet } from "@/schemas/pets";
import { ActivityLog } from "@/schemas/activity";

type ActivityHistoryPanelProps = {
  pets: Pet[];
  selectedPetId: string;
  historyType: string;
  historyDate: string;
  historyLogs: ActivityLog[];
  filteredLogs: ActivityLog[];
  groupedLogs: [string, ActivityLog[]][];
  onHistoryTypeChange: (value: string) => void;
  onHistoryDateChange: (value: string) => void;
  onDelete: (id: string) => void;
};

export function ActivityHistoryPanel({
  pets,
  selectedPetId,
  historyType,
  historyDate,
  historyLogs,
  filteredLogs,
  groupedLogs,
  onHistoryTypeChange,
  onHistoryDateChange,
  onDelete,
}: ActivityHistoryPanelProps) {
  const selectedPet = pets.find((pet) => pet.id === selectedPetId);
  const typeFilters =
    selectedPetId === "all" ? CATEGORY_FILTERS : getTypeFilters(selectedPet?.species ?? "other");

  const renderEdit = (item: ActivityLog) => <ActivityEditButton pets={pets} item={item} />;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg">Activity history</h2>
          <p className="text-xs text-muted-foreground">
            {historyLogs.length} {historyLogs.length === 1 ? "entry" : "entries"}
          </p>
        </div>
      </div>

      <div className="space-y-2 pb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {typeFilters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onHistoryTypeChange(value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
                historyType === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground shadow-(--shadow-soft)",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {ACTIVITY_TIME_FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onHistoryDateChange(value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium",
                historyDate === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground shadow-(--shadow-soft)",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {historyLogs.length === 0 ? (
        <section className="rounded-3xl bg-card p-6 text-center shadow-(--shadow-soft)">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
            <Clock3 className="h-5 w-5 text-primary" />
          </div>

          <h2 className="mt-3 font-display text-base">
            {filteredLogs.length === 0 ? "No activity recorded yet" : "No matching activity"}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {filteredLogs.length === 0
              ? "Activity you log will appear here."
              : "Try changing the activity or date filters."}
          </p>

          {filteredLogs.length === 0 ? (
            <ActivityLogButton pets={pets} label="Log activity" className="mt-4 rounded-full" />
          ) : (
            <Button
              variant="secondary"
              className="mt-4 rounded-full"
              onClick={() => {
                onHistoryTypeChange("all");
                onHistoryDateChange("all");
              }}
            >
              Clear filters
            </Button>
          )}
        </section>
      ) : (
        <div className="space-y-5">
          {groupedLogs.map(([dateKey, dateLogs]) => (
            <div key={dateKey}>
              <div className="mb-2 px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {formatGroupDate(dateKey)}
                </h3>
              </div>

              <ul className="divide-y divide-border/60 rounded-3xl bg-card shadow-(--shadow-soft)">
                {dateLogs.map((log) => (
                  <ActivityRow
                    key={log.id}
                    item={log}
                    pets={pets}
                    onDelete={onDelete}
                    renderEdit={renderEdit}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
