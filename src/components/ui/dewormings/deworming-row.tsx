import { Trash2 } from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import { getDewormingDisplay } from "@/lib/dewormings-utils";

import { Button } from "../common/button";

import { Deworming } from "@/schemas/deworming";
import { Pet } from "@/schemas/pets";

type DewormingRowProps = {
    item: Deworming;
    pets: Pet[];
    showPetName?: boolean;
    onDelete?: (item: Deworming) => void;
    renderEdit?: (item: Deworming) => React.ReactNode;
};

export function DewormingRow({
    item,
    pets,
    showPetName = true,
    onDelete,
    renderEdit,
}: DewormingRowProps) {
    const pet = pets.find((p) => p.id === item.pet_id);
    const display = getDewormingDisplay(item);

    const subtitle = [
        showPetName ? pet?.name : null,
        item.administered_by,
    ]
        .filter(Boolean)
        .join(" · ");

    let status: React.ReactNode = null;

    switch (display.status) {
        case "overdue":
            status = (
                <div className="text-xs text-muted-foreground">
                    Was due · {formatDate(item.next_due_at)}
                </div>
            );
            break;

        case "due_soon":
            status = (
                <div className="text-xs text-muted-foreground">
                    Due soon · {formatDate(item.next_due_at)}
                </div>
            );
            break;

        case "scheduled":
            status = (
                <div className="text-xs text-muted-foreground">
                    Next due · {formatDate(item.next_due_at)}
                </div>
            );
            break;
    }

    return (
        <li className="p-4 flex flex-col">
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className={"font-medium text-sm capitalize"}>
                        {item.product_name}
                    </div>
                    {subtitle && (
                        <div className="text-xs text-muted-foreground capitalize">
                            {subtitle}
                        </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                        Administered ·{" "}
                        {formatDate(item.administered_at)}
                    </div>

                    {status}

                    {item.notes && (
                        <p className="text-xs text-muted-foreground mt-1 capitalize">
                            {item.notes}
                        </p>
                    )}
                </div>
                {renderEdit && onDelete ? (
                    <div className="flex items-center justify-center gap-1">
                        {renderEdit(item)}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(item)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete Deworming"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <p className={cn("text-xs self-end", display.className)}>
                        {display.label}
                    </p>
                )}
            </div>
        </li>
    );
}