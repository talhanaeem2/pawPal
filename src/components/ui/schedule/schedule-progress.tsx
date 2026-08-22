import { Card, CardContent } from "@/components/ui/common/card";
import { Progress } from "@/components/ui/common/progress";

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
      </CardContent>
    </Card>
  );
}