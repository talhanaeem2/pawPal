import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useZodForm } from "@/hooks/use-zod-form";
import { supabase } from "@/integrations/supabase/client";
import { activityQuery } from "@/lib/queries";

import { Button } from "../common/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../common/select";
import { Input } from "../common/input";
import { Textarea } from "../common/textarea";
import { FormDialog } from "../common/form-dialog";
import { Field } from "../common/field";

import { ActivityLog, activityLogFormSchema, activityLogToForm, createEmptyActivityLogForm } from "@/schemas/activity";
import { Pet } from "@/schemas/pets";

interface IActivityFormDialog {
    pets: Pet[];
    item?: ActivityLog;
    trigger: React.ReactNode;
    initialOpen?: boolean
    onClose?: () => void;
}

export function ActivityFormDialog({ pets, item, trigger, initialOpen, onClose }: IActivityFormDialog) {
    const isEdit = !!item;
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const form = useZodForm(
        activityLogFormSchema,
        item ? activityLogToForm(item) : createEmptyActivityLogForm(pets[0]?.id)
    );

    useEffect(() => {
        if (initialOpen) {
            setOpen(true);
        }
    }, [initialOpen]);

    function resetForm() {
        form.reset(item ? activityLogToForm(item) : createEmptyActivityLogForm(pets[0]?.id));
    }

    const save = useMutation({
        mutationFn: async () => {
            const data = form.getValidated();

            if (!data) return;

            const payload = {
                pet_id: data.pet_id,
                activity_type: data.activity_type,
                duration_min: data.activity_type !== "weight" &&
                    data.duration_min ? Number(data.duration_min) : null,
                weight: data.activity_type === "weight" &&
                    data.weight ? Number(data.weight) : null,
                notes: data.notes || null,
                ...(isEdit ? {} : { occurred_at: new Date().toISOString() }),
            };

            const query = item
                ? supabase.from("activity_logs").update(payload).eq("id", item.id)
                : supabase.from("activity_logs").insert(payload);

            const { error } = await query;

            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: activityQuery.queryKey });
            toast.success(isEdit ? "Updated" : "Logged");
            setOpen(false);
            if (!isEdit) resetForm();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    });

    if (pets.length === 0 && !isEdit) return <Button disabled variant="outline" className="rounded-full">Add a pet first</Button>;

    return (
        <FormDialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (!o) {
                    resetForm();
                    onClose?.();
                }
            }}
            title={isEdit ? "Edit log" : "New log"}
            trigger={trigger}
        >
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Pet">
                        <Select value={form.values.pet_id} onValueChange={(v) => form.setField("pet_id", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </Field>
                    <Field label="Type" error={form.errors.activity_type}>
                        <Select value={form.values.activity_type} onValueChange={(v) => {
                            form.setField("activity_type", v);

                            if (v === "weight") {
                                form.setField("duration_min", "");
                            } else {
                                form.setField("weight", "");
                            }
                        }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="walk">Walk</SelectItem>
                                <SelectItem value="play">Play</SelectItem>
                                <SelectItem value="weight">Weight</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
                {form.values.activity_type !== "weight" ? (
                    <Field label="Duration (min)">
                        <Input type="number" value={form.values.duration_min} onChange={(e) => form.setField("duration_min", e.target.value)} />
                    </Field>
                ) : (
                    <Field label="Weight (kg)">
                        <Input type="number" step="0.1" value={form.values.weight} onChange={(e) => form.setField("weight", e.target.value)} required />
                    </Field>
                )}
                <Field label="Notes">
                    <Textarea rows={2} value={form.values.notes} onChange={(e) => form.setField("notes", e.target.value)} />
                </Field>
                <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                    {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save"}
                </Button>
            </form>
        </FormDialog>
    );
}