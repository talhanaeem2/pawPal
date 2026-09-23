import { Card, CardContent } from "@/components/ui/common/card";
import { Progress } from "@/components/ui/common/progress";
import { PartyPopper } from "lucide-react";

import { ScheduleProgress as ScheduleProgressData } from "./schedule-dashboard";

type ScheduleProgressProps = {
  progress: ScheduleProgressData;
};

export function ScheduleProgress({ progress }: ScheduleProgressProps) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex justify-between">
          <div>
            <p className="font-medium">Today&apos;s progress</p>
            <p className="text-xs text-muted-foreground">
              {progress.completedSlots} of {progress.totalSlots}{" "}
              {progress.totalSlots === 1 ? "reminder" : "reminders"} completed
            </p>
          </div>

          <span className="font-medium">{progress.progress}%</span>
        </div>

        <Progress value={progress.progress} />

        {progress.totalSlots > 0 && progress.progress === 100 && (
          <div
            className="flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
            role="status"
          >
            <PartyPopper className="h-4 w-4" aria-hidden="true" />
            Great job today! Everything is taken care of.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
