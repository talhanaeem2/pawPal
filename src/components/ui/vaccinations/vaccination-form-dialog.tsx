import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useZodForm } from "@/hooks/use-zod-form";
import { supabase } from "@/integrations/supabase/client";
import { petVaccinationsQuery, vaccinationsQuery } from "@/lib/queries";

import { Button } from "../common/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../common/select";
import { Input } from "../common/input";
import { Textarea } from "../common/textarea";
import { FormDialog } from "../common/form-dialog";
import { Field } from "../common/field";

import { Pet } from "@/schemas/pets";
import { createEmptyVaccinationForm, Vaccination, VaccinationForm, vaccinationFormSchema, vaccinationToForm } from "@/schemas/vacination";

interface IVaccinationFormDialog {
    pets: Pet[];
    item?: Vaccination;
    trigger: React.ReactNode;
    initialOpen?: boolean
    hidePetSelector?: boolean;
    onClose?: () => void;
}

export function VaccinationsFormDialog({ pets, item, trigger, initialOpen, hidePetSelector = false, onClose }: IVaccinationFormDialog) {
    const isEdit = !!item;
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const form = useZodForm(
        vaccinationFormSchema,
        item ? vaccinationToForm(item) : createEmptyVaccinationForm(pets[0]?.id)
    );

    function resetForm() {
        form.reset(item ? vaccinationToForm(item) : createEmptyVaccinationForm(pets[0]?.id));
    }

    useEffect(() => {
        if (initialOpen) {
            setOpen(true);
        }
    }, [initialOpen]);

    const save = useMutation({
        mutationFn: async (data: VaccinationForm) => {

            const payload = {
                pet_id: data.pet_id,
                vaccine_name: data.vaccine_name.trim(),
                administered_at: data.administered_at,
                next_due_at: data.next_due_at || null,
                completed_at: data.completed_at ? data.completed_at : null,
                administered_by: data.administered_by || null,
                notes: data.notes || null,
            };

            const query = item
                ? supabase.from("vaccinations").update(payload).eq("id", item.id)
                : supabase.from("vaccinations").insert(payload);

            const { error } = await query;

            if (error) throw error;
        },
        onSuccess: async (_, data) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: vaccinationsQuery.queryKey }),
                qc.invalidateQueries({ queryKey: petVaccinationsQuery(data.pet_id).queryKey }),
            ]);
            toast.success(isEdit ? "Updated" : "Vaccination saved");
            setOpen(false);
            if (!isEdit) resetForm();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    });

    if (pets.length === 0 && !isEdit) return <Button disabled variant="outline" className="rounded-full">Add a pet first</Button>;

    const today = new Date().toISOString().split("T")[0];

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
            title={isEdit ? "Edit vaccination" : "New vaccination"}
            trigger={trigger}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    const data = form.getValidated();

                    if (!data) return;
                    save.mutate(data);
                }}
                className="space-y-3"
            >
                {!hidePetSelector && (
                    <Field label="Pet" error={form.errors.pet_id}>
                        <Select value={form.values.pet_id} onValueChange={(v) => form.setField("pet_id", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </Field>
                )}
                <Field label="Vaccine" error={form.errors.vaccine_name}>
                    <Input type="text" value={form.values.vaccine_name} onChange={(e) => form.setField("vaccine_name", e.target.value)} required />
                </Field>
                <Field label="Administered on" error={form.errors.administered_at}>
                    <Input type="date" value={form.values.administered_at} onChange={(e) => form.setField("administered_at", e.target.value)} required />
                </Field>
                <Field label="Next due">
                    <Input type="date" value={form.values.next_due_at} onChange={(e) => form.setField("next_due_at", e.target.value)} disabled={!!form.values.completed_at} />
                </Field>
                <Field label="Completed">
                    <div className="flex items-center h-10 gap-2">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={!!form.values.completed_at}
                            onClick={() => form.setField("completed_at", form.values.completed_at ? "" : today)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${form.values.completed_at ? "bg-primary" : "bg-input"}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.values.completed_at ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                        <span className="text-sm text-muted-foreground">{form.values.completed_at ? "Completed" : "Pending"}</span>
                    </div>
                </Field>
                <Field label="Vet / Clinic">
                    <Input
                        value={form.values.administered_by}
                        onChange={(e) => form.setField("administered_by", e.target.value)}
                        placeholder="Happy Paws Clinic"
                    />
                </Field>
                <Field label="Notes">
                    <Textarea rows={3} value={form.values.notes} onChange={(e) => form.setField("notes", e.target.value)} />
                </Field>
                <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                    {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save"}
                </Button>
            </form>
        </FormDialog >
    );
}