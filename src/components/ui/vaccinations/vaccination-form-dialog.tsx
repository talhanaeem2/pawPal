import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { useZodForm } from "@/hooks/use-zod-form";
import { supabase } from "@/integrations/supabase/client";
import { petVaccinationsQuery, vaccinationsQuery } from "@/lib/queries";
import { todayDateString } from "@/lib/utils";

import { Button } from "../common/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../common/select";
import { Input } from "../common/input";
import { Textarea } from "../common/textarea";
import { DatePicker } from "../common/date-picker";
import { FormDialog } from "../common/form-dialog";
import { Field } from "../common/field";

import { Pet } from "@/schemas/pets";
import { createEmptyVaccinationForm, Vaccination, VaccinationForm, vaccinationFormSchema, vaccinationToForm } from "@/schemas/vacination";
import { getPetDisplayName } from "@/schemas/pets";

// Weeks options for auto-calculating next due date
const NEXT_DUE_PRESETS = [
    { label: "3 weeks", weeks: 3 },
    { label: "4 weeks", weeks: 4 },
    { label: "3 months", weeks: 13 },
    { label: "6 months", weeks: 26 },
    { label: "1 year", weeks: 52 },
    { label: "3 years", weeks: 156 },
];

function addWeeks(dateStr: string, weeks: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + weeks * 7);
    return d.toISOString().slice(0, 10);
}

interface IVaccinationFormDialog {
    pets: Pet[];
    item?: Vaccination;
    trigger: React.ReactNode;
    hidePetSelector?: boolean;
    defaultPetId?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function VaccinationsFormDialog({ pets, item, trigger, hidePetSelector = false, defaultPetId, open: controlledOpen, onOpenChange }: IVaccinationFormDialog) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isEdit = !!item;
    const qc = useQueryClient();
    const open = controlledOpen ?? internalOpen;
    const form = useZodForm(
        vaccinationFormSchema,
        item ? vaccinationToForm(item) : {
            ...createEmptyVaccinationForm(),
            pet_id: defaultPetId ?? "",
        }
    );

    function handleOpenChange(o: boolean) {
        setInternalOpen(o);
        onOpenChange?.(o);
        if (!o) resetForm();
    }

    function resetForm() {
        form.reset(item ? vaccinationToForm(item) : {
            ...createEmptyVaccinationForm(),
            pet_id: defaultPetId ?? "",
        });
    }

    // When a preset is picked, calculate next due from the administered date
    function applyPreset(weeks: number) {
        const base = form.values.administered_at || todayDateString();
        form.setField("next_due_at", addWeeks(base, weeks));
    }

    const seriesComplete = !!form.values.completed_at;

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
            handleOpenChange(false);
            if (!isEdit) resetForm();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    });

    if (pets.length === 0 && !isEdit) return <Button disabled variant="outline" className="rounded-full">Add a pet first</Button>;

    const today = todayDateString();

    return (
        <FormDialog
            open={open}
            onOpenChange={handleOpenChange}
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
                        <Select value={form.values.pet_id} onValueChange={(v) => form.setField("pet_id", v)} required>
                            <SelectTrigger><SelectValue placeholder="Choose a pet" /></SelectTrigger>
                            <SelectContent>
                                {pets.map((p) =>
                                    <SelectItem key={p.id} value={p.id}>{getPetDisplayName(p)}</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </Field>
                )}

                <Field label="Vaccine" error={form.errors.vaccine_name}>
                    <Input type="text" value={form.values.vaccine_name} onChange={(e) => form.setField("vaccine_name", e.target.value)} placeholder="Rabies, DHPP, FVRCP" required />
                </Field>

                <Field label="Date given" error={form.errors.administered_at}>
                    <DatePicker
                        value={form.values.administered_at}
                        onChange={(date) => form.setField("administered_at", date)}
                        placeholder="Select date"
                    />
                </Field>

                <Field label="Vet or clinic">
                    <Input
                        value={form.values.administered_by}
                        onChange={(e) => form.setField("administered_by", e.target.value)}
                        placeholder="Happy Paws Clinic"
                    />
                </Field>

                {/* Series complete toggle — OFF means more doses expected (the common case) */}
                <Field label="Series complete">
                    <div className="flex items-center h-10 gap-2">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={seriesComplete}
                            onClick={() => form.setField("completed_at", seriesComplete ? "" : today)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${seriesComplete ? "bg-primary" : "bg-input"}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${seriesComplete ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                        <span className="text-sm text-muted-foreground">
                            {seriesComplete ? "No more doses needed" : "More doses expected"}
                        </span>
                    </div>
                </Field>

                {/* Only show next due when series isn't complete */}
                {!seriesComplete && (
                    <Field label="Next dose due">
                        <DatePicker
                            value={form.values.next_due_at}
                            onChange={(date) => form.setField("next_due_at", date)}
                            placeholder="Select date"
                        />
                        {/* Quick presets — auto-calculate from the administered date */}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {NEXT_DUE_PRESETS.map((p) => (
                                <button
                                    key={p.weeks}
                                    type="button"
                                    onClick={() => applyPreset(p.weeks)}
                                    className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </Field>
                )}

                <Field label="Notes">
                    <Textarea rows={3} value={form.values.notes} onChange={(e) => form.setField("notes", e.target.value)} placeholder="Anything you'd like to remember" />
                </Field>

                <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                    {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save vaccination"}
                </Button>
            </form>
        </FormDialog>
    );
}
