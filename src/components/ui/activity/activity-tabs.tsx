import { Activity, Clock3, Scale, Scissors } from "lucide-react";

import { cn } from "@/lib/utils";

import { ActivityTab } from "./activity-dashboard";

type ActivityTabsProps = {
  activeTab: ActivityTab;
  hasExercise: boolean;
  onSelectTab: (tab: ActivityTab) => void;
};

export function ActivityTabs({ activeTab, hasExercise, onSelectTab }: ActivityTabsProps) {
  const tabs = [
    ...(hasExercise ? [{ value: "exercise" as const, label: "Exercise", icon: Activity }] : []),
    { value: "care" as const, label: "Care", icon: Scissors },
    { value: "health" as const, label: "Health", icon: Scale },
    { value: "history" as const, label: "History", icon: Clock3 },
  ];
  const tabCount = tabs.length;

  return (
    <div className="rounded-2xl bg-secondary/60 p-1">
      <div className={cn("grid gap-1", tabCount === 4 ? "grid-cols-4" : "grid-cols-3")}>
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelectTab(value)}
            className={cn(
              "flex min-w-0 items-center justify-center rounded-xl font-medium transition",
              tabCount === 4 ? "gap-1 p-2 text-xs" : "gap-1.5 p-2 text-sm",
              activeTab === value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
