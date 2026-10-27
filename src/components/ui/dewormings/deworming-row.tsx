import { Trash2, CheckCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { cn, formatDate, todayDateString } from "@/lib/utils";
import { getDewormingDisplay } from "@/lib/dewormings-utils";
import { supabase } from "@/integrations/supabase/client";
import { dewormingsQuery, petDewormingsQuery } from "@/lib/queries";

import { Button } from "../common/button";

import { Deworming } from "@/schemas/deworming";
import { Pet, getPetDisplayName } from "@/schemas/pets";

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
    const qc = useQueryClient();

    const subtitle = [
        showPetName && pet ? getPetDisplayName(pet) : null,
        item.administered_by,
    ]
        .filter(Boolean)
        .join(" · ");

    const markGiven = useMutation({
        mutationFn: async () => {
            const today = todayDateString();
            const { error } = await supabase
                .from("dewormings")
                .update({
                    administered_at: today,
                    next_due_at: null,
                    completed_at: null,
                })
                .eq("id", item.id);
            if (error) throw error;
        },
        onSuccess: async () => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: dewormingsQuery.queryKey }),
                qc.invalidateQueries({ queryKey: petDewormingsQuery(item.pet_id).queryKey }),
            ]);
            toast.success("Marked as given today — set the next due date when ready.");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    });

    const isActionable = display.status === "overdue" || display.status === "due_soon";

    let status: React.ReactNode = null;
    switch (display.status) {
        case "overdue":
            status = <div className="text-xs text-destructive font-medium">Was due · {formatDate(item.next_due_at)}</div>;
            break;
        case "due_soon":
            status = <div className="text-xs text-amber-600 dark:text-amber-400">Due soon · {formatDate(item.next_due_at)}</div>;
            break;
        case "scheduled":
            status = <div className="text-xs text-muted-foreground">Next due · {formatDate(item.next_due_at)}</div>;
            break;
        case "completed":
            status = <div className="text-xs text-muted-foreground">Completed · {formatDate(item.completed_at!)}</div>;
            break;
    }

    return (
        <li className="ps-4 py-3 flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm capitalize">{item.product_name}</div>
                    {subtitle && (
                        <div className="text-xs text-muted-foreground capitalize">{subtitle}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                        Last given · {formatDate(item.administered_at)}
                    </div>
                    {status}
                    {item.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{item.notes}</p>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    {isActionable && renderEdit && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full text-xs gap-1.5"
                            onClick={() => markGiven.mutate()}
                            disabled={markGiven.isPending}
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Given today
                        </Button>
                    )}
                    {renderEdit && onDelete ? (
                        <>
                            {renderEdit(item)}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(item)}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="Delete deworming"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <p className={cn("text-xs self-start mt-1", display.className)}>
                            {display.label}
                        </p>
                    )}
                </div>
            </div>
        </li>
    );
}
