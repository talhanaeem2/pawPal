import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { vetQuery } from "@/lib/queries";
import { useZodForm } from "@/hooks/use-zod-form";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "../common/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../common/select";
import { Input } from "../common/input";
import { Textarea } from "../common/textarea";
import { FormDialog } from "../common/form-dialog";
import { Field } from "../common/field";

import { Pet } from "@/schemas/pets";
import { createEmptyVetAppointmentForm, VetAppointment, vetAppointmentFormSchema, vetAppointmentToForm } from "@/schemas/vet";

interface IVaccinationFormDialog {
    pets: Pet[];
    item?: VetAppointment;
    trigger: React.ReactNode;
    initialOpen?: boolean
    onClose?: () => void;
}

export function VetFormDialog({ pets, item, trigger, initialOpen, onClose }: IVaccinationFormDialog) {
    const isEdit = !!item;
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const form = useZodForm(
        vetAppointmentFormSchema,
        item ? vetAppointmentToForm(item) : createEmptyVetAppointmentForm(pets[0]?.id)
    );

    function resetForm() {
        form.reset(item ? vetAppointmentToForm(item) : createEmptyVetAppointmentForm(pets[0]?.id));
    }

    useEffect(() => {
        if (initialOpen) {
            setOpen(true);
        }
    }, [initialOpen]);

    const save = useMutation({
        mutationFn: async () => {
            const data = form.getValidated();

            if (!data) return;
            const payload = {
                pet_id: data.pet_id,
                date: new Date(data.date).toISOString(),
                reason: data.reason.trim(),
                vet_name: data.vet_name || null,
                completed: data.completed || false,
                notes: data.notes || null,
            };

            const query = item
                ? supabase.from("vet_appointments").update(payload).eq("id", item.id)
                : supabase.from("vet_appointments").insert(payload);

            const { error } = await query;

            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: vetQuery.queryKey });
            toast.success(isEdit ? "Updated" : "Appointment saved");
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
            title={isEdit ? "Edit appointment" : "New appointment"}
            trigger={trigger}
        >
            <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
                <Field label="Pet">
                    <Select value={form.values.pet_id} onValueChange={(v) => form.setField("pet_id", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                </Field>
                <Field label="When" error={form.errors.date}>
                    <Input type="datetime-local" value={form.values.date} onChange={(e) => form.setField("date", e.target.value)} required />
                </Field>
                <Field label="Reason" error={form.errors.reason}>
                    <Input value={form.values.reason} onChange={(e) => form.setField("reason", e.target.value)} placeholder="Annual checkup" required />
                </Field>
                <Field label="Vet / Clinic">
                    <Input value={form.values.vet_name} onChange={(e) => form.setField("vet_name", e.target.value)} />
                </Field>
                <Field label="Notes">
                    <Textarea rows={3} value={form.values.notes} onChange={(e) => form.setField("notes", e.target.value)} />
                </Field>
                <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                    {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save"}
                </Button>
            </form>
        </FormDialog>
    );
}