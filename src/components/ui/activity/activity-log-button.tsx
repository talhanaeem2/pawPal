import { Plus } from "lucide-react";

import { Button } from "@/components/ui/common/button";
import { ActivityFormDialog } from "./activity-form-dialog";

import { Pet } from "@/schemas/pets";

type ActivityLogButtonProps = {
  pets: Pet[];
  label: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ActivityLogButton({
  pets,
  label,
  className,
  open,
  onOpenChange,
}: ActivityLogButtonProps) {
  return (
    <ActivityFormDialog
      pets={pets}
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        <Button className={className ?? "rounded-full"}>
          <Plus className="mr-1 h-4 w-4" />
          {label}
        </Button>
      }
    />
  );
}
