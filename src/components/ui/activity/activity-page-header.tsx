import type { RefObject } from "react";

import { Page } from "@/components/layout/page";
import { ActivityLogButton } from "./activity-log-button";

import { Pet } from "@/schemas/pets";

type ActivityPageHeaderProps = {
  pets: Pet[];
  headerRef: RefObject<HTMLDivElement | null>;
  descriptionRef: RefObject<HTMLDivElement | null>;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  description: string;
};

export function ActivityPageHeader({
  pets,
  headerRef,
  descriptionRef,
  createOpen,
  onCreateOpenChange,
  description,
}: ActivityPageHeaderProps) {
  return (
    <Page.Header ref={headerRef} className="gap-2 pt-3 pb-2">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl">Activity</h1>

          <div ref={descriptionRef} className="overflow-hidden">
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <ActivityLogButton
          pets={pets}
          label="Log"
          open={createOpen}
          onOpenChange={onCreateOpenChange}
        />
      </header>
    </Page.Header>
  );
}
