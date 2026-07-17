import { Trash2 } from "lucide-react";

import { cn, formatDate } from "@/lib/utils";
import { getVaccinationDisplay } from "@/lib/vaccinations-utils";

import { Button } from "../common/button";

import { Pet } from "@/schemas/pets";
import { Vaccination } from "@/schemas/vacination";

type VaccinationRowProps = {
    item: Vaccination;
    pets: Pet[];
    showPetName?: boolean;
    onDelete?: (item: Vaccination) => void;
    renderEdit?: (item: Vaccination) => React.ReactNode;
};

export function VaccinationRow({
    item,
    pets,
    showPetName = true,
    onDelete,
    renderEdit,
}: VaccinationRowProps) {
    const pet = pets.find((p) => p.id === item.pet_id);
    const display = getVaccinationDisplay(item);

    const subtitle = [
        showPetName ? pet?.name : null,
        item.administered_by,
    ]
        .filter(Boolean)
        .join(" · ");

    let status: React.ReactNode = null;

    switch (display.status) {
        case "completed":
            status = (
                <div className="text-xs text-muted-foreground">
                    Completed · {formatDate(item.completed_at)}
                </div>
            );
            break;

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
        <li className="pl-4 py-2 flex flex-col">
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className={"font-medium text-sm capitalize"}>
                        {item.vaccine_name}
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
                            aria-label="Delete vaccination"
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