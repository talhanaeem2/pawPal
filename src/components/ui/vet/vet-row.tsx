import { Trash2 } from "lucide-react";

import { formatDateTime } from "@/lib/utils";

import { Button } from "../common/button";

import { Pet } from "@/schemas/pets";
import { VetAppointment } from "@/schemas/vet";

type VetRowProps = {
    item: VetAppointment;
    pets: Pet[];
    showPetName?: boolean;
    onDelete?: (item: VetAppointment) => void;
    onToggle?: (a: { id: string; completed: boolean }) => void;
    renderEdit?: (item: VetAppointment) => React.ReactNode;
};

export function VetRow({
    item,
    pets,
    showPetName = true,
    onDelete,
    onToggle,
    renderEdit,
}: VetRowProps) {
    const pet = pets.find((p) => p.id === item.pet_id);

    const subtitle = [
        showPetName ? pet?.name : null,
        formatDateTime(item.date),
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <li key={item.id} className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm capitalize ${item.completed ? "line-through text-muted-foreground" : ""}`}>{item.reason}</div>
                {subtitle && (
                    <div className="text-xs text-muted-foreground capitalize">
                        {subtitle}
                    </div>
                )}
                {item.vet_name && (
                    <div className="text-xs text-muted-foreground capitalize">
                        {item.vet_name}
                    </div>
                )}
                {item.notes && <p className="text-xs text-muted-foreground mt-1 capitalize">{item.notes}</p>}
            </div>
            {onDelete && renderEdit && onToggle && (
                <div className="flex items-center gap-1">
                    <button onClick={() => onToggle({ id: item.id, completed: item.completed })}
                        className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground hover:opacity-80">
                        {item.completed ? "Reopen" : "Done"}
                    </button>
                    {renderEdit(item)}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(item)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete appointment"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </li>
    );
}