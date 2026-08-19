import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useZodForm } from "@/hooks/use-zod-form";
import { supabase } from "@/integrations/supabase/client";
import { dewormingsQuery, petDewormingsQuery } from "@/lib/queries";

import { Button } from "../common/button";
import { FormDialog } from "../common/form-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../common/select";
import { Input } from "../common/input";
import { DatePicker } from "../common/date-picker";
import { Textarea } from "../common/textarea";
import { Field } from "../common/field";

import { Pet } from "@/schemas/pets";
import { createEmptyDewormingForm, Deworming, DewormingForm, dewormingFormSchema, dewormingToForm } from "@/schemas/deworming";

interface IDewormingFormDialog {
    pets: Pet[];
    item?: Deworming;
    trigger: React.ReactNode;
    hidePetSelector?: boolean;
    defaultPetId?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function DewormingFormDialog({ pets, item, trigger, hidePetSelector, defaultPetId, open: controlledOpen, onOpenChange }: IDewormingFormDialog) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isEdit = !!item;
    const qc = useQueryClient();
    const open = controlledOpen ?? internalOpen;
    const form = useZodForm(
        dewormingFormSchema,
        item ? dewormingToForm(item) : {
            ...createEmptyDewormingForm(),
            pet_id: defaultPetId ?? "",
        }
    );

    function handleOpenChange(o: boolean) {
        setInternalOpen(o);
        onOpenChange?.(o);
        if (!o) resetForm();
    }

    function resetForm() {
        form.reset(item ? dewormingToForm(item) : {
            ...createEmptyDewormingForm(),
            pet_id: defaultPetId ?? "",
        });
    }

    const save = useMutation({
        mutationFn: async (data: DewormingForm) => {

            const payload = {
                pet_id: data.pet_id,
                product_name: data.product_name.trim(),
                administered_at: data.administered_at,
                next_due_at: data.next_due_at,
                administered_by: data.administered_by || null,
                notes: data.notes || null,
            };

            if (item) {
                const { error } = await supabase.from("dewormings").update(payload).eq("id", item.id);

                if (error) throw error;
                return;
            }

            // Close previous active deworming
            const { data: previous } = await supabase
                .from("dewormings")
                .select("id")
                .eq("pet_id", data.pet_id)
                .is("completed_at", null)
                .order("administered_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (previous) {
                const { error } = await supabase
                    .from("dewormings")
                    .update({
                        completed_at: data.administered_at,
                    })
                    .eq("id", previous.id);

                if (error) throw error;
            }

            // Insert new active deworming
            const { error } = await supabase
                .from("dewormings")
                .insert(payload);

            if (error) throw error;
        },
        onSuccess: async (_, data) => {
            await Promise.all([
                qc.invalidateQueries({ queryKey: dewormingsQuery.queryKey }),
                qc.invalidateQueries({ queryKey: petDewormingsQuery(data.pet_id).queryKey }),
            ]);
            toast.success(isEdit ? "Updated" : "Deworming saved");
            handleOpenChange(false);
            if (!isEdit) resetForm();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    });

    if (pets.length === 0 && !isEdit) return <Button disabled variant="outline" className="rounded-full">Add a pet first</Button>;

    return (
        <FormDialog
            open={open}
            onOpenChange={handleOpenChange}
            title={isEdit ? "Edit deworming" : "New deworming"}
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
                    <Field label="Pet">
                        <Select value={form.values.pet_id} onValueChange={(v) => form.setField("pet_id", v)} required>
                            <SelectTrigger><SelectValue placeholder="Choose a pet" /></SelectTrigger>
                            <SelectContent>
                                {pets.map((p) =>
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </Field>
                )}
                <Field label="Dewormer" error={form.errors.product_name}>
                    <Input type="text" value={form.values.product_name} onChange={(e) => form.setField("product_name", e.target.value)} placeholder="e.g. Drontal, Milbemax, Panacur" required />
                </Field>
                <Field label="Date given" error={form.errors.administered_at}>
                    {/* <Input type="date" value={form.values.administered_at} onChange={(e) => form.setField("administered_at", e.target.value)} required /> */}
                    <DatePicker
                        value={form.values.administered_at}
                        onChange={(date) => form.setField("administered_at", date)}
                        placeholder="Select date"
                    />
                </Field>
                <Field label="Next dose due" error={form.errors.next_due_at}>
                    {/* <Input type="date" value={form.values.next_due_at} onChange={(e) => form.setField("next_due_at", e.target.value)} required /> */}
                    <DatePicker
                        value={form.values.next_due_at}
                        onChange={(date) => form.setField("next_due_at", date)}
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
                <Field label="Notes">
                    <Textarea rows={3} value={form.values.notes} onChange={(e) => form.setField("notes", e.target.value)} placeholder="Anything you'd like to remember" />
                </Field>
                <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                    {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Save deworming"}
                </Button>
            </form>
        </FormDialog>
    );
}