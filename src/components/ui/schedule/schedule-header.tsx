import type { RefObject } from "react";
import { Plus } from "lucide-react";

import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/common/button";
import { ScheduleDialog } from "./schedule-dialog";

import { Pet } from "@/schemas/pets";

type ScheduleHeaderProps = {
  pets: Pet[];
  headerRef: RefObject<HTMLDivElement | null>;
  descriptionRef: RefObject<HTMLDivElement | null>;
  openCreate: boolean | undefined;
  onCreateClose?: () => void;
};

export function ScheduleHeader({
  pets,
  headerRef,
  descriptionRef,
  openCreate,
  onCreateClose,
}: ScheduleHeaderProps) {
  return (
    <Page.Header ref={headerRef} className="gap-2 pt-3 pb-2">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl">Schedule</h1>
          <div
            ref={descriptionRef}
            className="overflow-hidden will-change-[max-height,opacity,transform] motion-reduce:transform-none"
          >
            <p className="text-sm text-muted-foreground">
              Meals, meds & routines.
            </p>
          </div>
        </div>

        <ScheduleDialog
          pets={pets}
          initialOpen={openCreate}
          onClose={onCreateClose}
          trigger={
            <Button className="rounded-full">
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          }
        />
      </header>
    </Page.Header>
  );
}