import { Dumbbell, Footprints, Scale, Scissors, Trash2, Zap } from "lucide-react";

import { formatDate, formatDateTime } from "@/lib/utils";
import { ACTIVITY_LABELS } from "@/lib/activity-utils";

import { Button } from "../common/button";

import { ActivityLog } from "@/schemas/activity";
import { Pet } from "@/schemas/pets";

type ActivityRowProps = {
    item: ActivityLog;
    pets: Pet[];
    onDelete: (id: string) => void;
    renderEdit: (item: ActivityLog) => React.ReactNode;
};

const icons: Record<string, typeof Footprints> = { walk: Footprints, run: Zap, play: Dumbbell, weight: Scale, grooming: Scissors };

export function ActivityRow({
    item,
    pets,
    onDelete,
    renderEdit,
}: ActivityRowProps) {
    const pet = pets.find((p) => p.id === item.pet_id);
    const Icon = icons[item.activity_type] ?? Footprints;

    return (
        <li key={item.id} className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-secondary/60 flex items-center justify-center">
                <Icon className="h-4 w-4 text-foreground" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                    {ACTIVITY_LABELS[item.activity_type] ?? item.activity_type}
                    {pet ? ` · ${pet.name}` : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                    {item.activity_type !== "grooming" ? formatDateTime(item.occurred_at) : formatDate(item.occurred_at)}
                    {item.duration_min ? ` · ${item.duration_min} min` : ""}
                    {item.weight ? ` · ${item.weight}${item.activity_type === "weight" ? " kg" : ""}` : ""}
                    <br />
                    {!item.duration_min && !item.weight && !item.notes && item.activity_type !== "grooming" && (
                        <span className="opacity-50">No data logged</span>
                    )}
                </div>
                {item.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{item.notes}</p>}
            </div>
            {renderEdit(item)}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(item.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete log"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </li>
    );
}