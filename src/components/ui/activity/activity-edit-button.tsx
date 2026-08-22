import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/common/button";
import { ActivityLog } from "@/schemas/activity";
import { Pet } from "@/schemas/pets";

import { ActivityFormDialog } from "./activity-form-dialog";

type ActivityEditButtonProps = {
  pets: Pet[];
  item: ActivityLog;
};

export function ActivityEditButton({ pets, item }: ActivityEditButtonProps) {
  return (
    <ActivityFormDialog
      pets={pets}
      item={item}
      trigger={
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      }
    />
  );
}
