import { Dumbbell, Footprints, Scale, Trash2 } from "lucide-react";

import { Button } from "../common/button";

import { ActivityLog } from "@/schemas/activity";
import { Pet } from "@/schemas/pets";

type ActivityRowProps = {
    item: ActivityLog;
    pets: Pet[];
    onDelete: (id: string) => void;
    renderEdit: (item: ActivityLog) => React.ReactNode;
};

const icons: Record<string, typeof Footprints> = { walk: Footprints, play: Dumbbell, weight: Scale };

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
                <div className="font-medium text-sm capitalize">{item.activity_type}{pet ? ` · ${pet.name}` : ""}</div>
                <div className="text-xs text-muted-foreground">
                    {new Date(item.occurred_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {item.duration_min ? ` · ${item.duration_min} min` : ""}
                    {item.weight ? ` · ${item.weight}${item.activity_type === "weight" ? " kg" : ""}` : ""}
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