import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { activityQuery } from "@/lib/queries";
import { buildOccurredAt, getActivityType } from "@/lib/schedule-utils";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../common/dialog";
import { Field } from "../common/field";
import { Input } from "../common/input";
import { Button } from "../common/button";

import { ScheduleWithPets } from "@/schemas/schedule";

interface LogActivityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    schedule: ScheduleWithPets;
    timeSlot: string | null;
    targetPetId?: string; // undefined = all pets
    today: string;
    pets: { id: string; name: string }[];
    onMarkDone: () => void; // callback to actually mark done in schedule
}

interface UndoActivityDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    schedule: ScheduleWithPets;
    onUndo: (deleteLog: boolean) => void;
}

export function UndoActivityDialog({
    open,
    onOpenChange,
    schedule,
    onUndo,
}: UndoActivityDialogProps) {
    const [deleteLog, setDeleteLog] = useState(false);

    // Reset checkbox when dialog opens
    useEffect(() => {
        if (open) setDeleteLog(false);
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-display">
                        Undo {schedule.title}?
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        This will mark the reminder as not done today.
                    </p>

                    <button
                        type="button"
                        onClick={() => setDeleteLog((v) => !v)}
                        className="w-full flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-left hover:bg-muted/30 transition"
                    >
                        <div className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition ${deleteLog
                            ? "bg-primary border-primary"
                            : "border-border bg-background"
                            }`}>
                            {deleteLog && (
                                <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-medium">Also delete the activity log</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Removes the {schedule.kind} log that was created when you marked this done
                            </p>
                        </div>
                    </button>

                    <div className="flex flex-col gap-2">
                        <Button
                            className="w-full rounded-full"
                            onClick={() => { onUndo(deleteLog); onOpenChange(false); }}
                        >
                            Undo reminder
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full rounded-full text-muted-foreground"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function LogActivityDialog({
    open,
    onOpenChange,
    schedule,
    timeSlot,
    targetPetId,
    today,
    pets,
    onMarkDone,
}: LogActivityDialogProps) {
    const qc = useQueryClient();
    const isWeight = schedule.kind === "weight";
    const label = isWeight ? "Weight (kg)" : "Duration (min)";
    const placeholder = isWeight ? "e.g. 25.5" : "e.g. 30";
    const inputType = "number";
    const inputStep = isWeight ? "0.1" : "1";

    const petsSorted = [...schedule.schedule_item_pets]
        .filter((sip) => targetPetId ? sip.pet_id === targetPetId : true)
        .map((sip) => ({
            scheduleItemPetId: sip.id,
            petId: sip.pet_id,
            petName: pets.find((p) => p.id === sip.pet_id)?.name ?? "Pet",
        }));

    const [inputs, setInputs] = useState<Record<string, string>>(
        () => Object.fromEntries(petsSorted.map((p) => [p.petId, ""]))
    );

    // Reset inputs when dialog opens
    useEffect(() => {
        if (open) {
            setInputs(Object.fromEntries(petsSorted.map((p) => [p.petId, ""])));
        }
    }, [open]);

    const logActivity = useMutation({
        mutationFn: async () => {
            const occurredAt = buildOccurredAt(today, timeSlot);
            const activityType = getActivityType(schedule.kind);

            const rows = petsSorted
                .filter((p) => inputs[p.petId]?.trim())
                .map((p) => ({
                    pet_id: p.petId,
                    activity_type: activityType,
                    occurred_at: occurredAt,
                    ...(isWeight
                        ? { weight: Number(inputs[p.petId]) }
                        : { duration_min: Number(inputs[p.petId]) }
                    ),
                    notes: null,
                }));

            if (rows.length > 0) {
                const { error } = await supabase.from("activity_logs").insert(rows);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: activityQuery.queryKey });
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to log activity"),
    });

    async function handleSaveAndLog() {
        await logActivity.mutateAsync();
        onMarkDone();
        onOpenChange(false);
    }

    async function handleJustMarkDone() {
        const occurredAt = buildOccurredAt(today, timeSlot);
        const activityType = getActivityType(schedule.kind);

        const rows = petsSorted.map((p) => ({
            pet_id: p.petId,
            activity_type: activityType,
            occurred_at: occurredAt,
            duration_min: null,
            weight: null,
            notes: null,
        }));

        const { error } = await supabase.from("activity_logs").insert(rows);

        if (error) {
            toast.error("Marked done but couldn't create activity log");
        } else {
            qc.invalidateQueries({ queryKey: activityQuery.queryKey });
        }

        onMarkDone();
        onOpenChange(false);
    }

    const multiplePets = petsSorted.length > 1;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-display">
                        {schedule.title} done!
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Want to log{" "}
                        {isWeight ? "their weight" : "how long"}?
                        {" "}This will also create an activity log.
                    </p>

                    <div className="space-y-3">
                        {petsSorted.map((pet) => (
                            <Field
                                key={pet.petId}
                                label={multiplePets ? `${pet.petName} — ${label}` : label}
                            >
                                <Input
                                    type={inputType}
                                    step={inputStep}
                                    min="0"
                                    value={inputs[pet.petId] ?? ""}
                                    onChange={(e) =>
                                        setInputs((prev) => ({ ...prev, [pet.petId]: e.target.value }))
                                    }
                                    placeholder={placeholder}
                                />
                            </Field>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Button
                            className="w-full rounded-full"
                            onClick={handleSaveAndLog}
                            disabled={logActivity.isPending}
                        >
                            {logActivity.isPending ? "Saving…" : "Save & log activity"}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full rounded-full text-muted-foreground"
                            onClick={handleJustMarkDone}
                            disabled={logActivity.isPending}
                        >
                            Just mark done
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}