import { createFileRoute, Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, vaccinationsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

import NotFoundState from "@/components/ui/not-found-state";
import InlineLoader from "@/components/ui/inline-loader";
import InlineErrorState from "@/components/ui/inline-error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useZodForm } from "@/hooks/use-zod-form";
import { Field } from "@/components/ui/field";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { createEmptyVaccinationForm, Vaccination, vaccinationFormSchema, vaccinationToForm } from "@/schemas/vacination";
import { getVaccinationTone, getVaccinationToneClass, getVaccinationToneLabel } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/health/vaccinations")({
    loader: ({ context }) => {
        context.queryClient.ensureQueryData(petsQuery);
        context.queryClient.ensureQueryData(vaccinationsQuery);
    },
    pendingComponent: () => <InlineLoader />,
    head: () => ({ meta: [{ title: "Vaccinations · Pawpal" }] }),
    component: VetPage,
    errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
    notFoundComponent: () => <NotFoundState />,
});

function VetPage() {
    const { data: pets } = useSuspenseQuery(petsQuery);
    const { data: vaccinations } = useSuspenseQuery(vaccinationsQuery);
    const qc = useQueryClient();
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const now = Date.now();

    function getVaccinationStatus(v: Vaccination) {
        if (v.completed_at) return "completed";

        if (v.next_due_at && new Date(v.next_due_at).getTime() < now) {
            return "overdue";
        }

        return "upcoming";
    }

    const upcoming = vaccinations
        .filter((v) => getVaccinationStatus(v) === "upcoming")
        .sort((a, b) => new Date(a.next_due_at!).getTime() - new Date(b.next_due_at!).getTime());

    const overdue = vaccinations
        .filter((v) => getVaccinationStatus(v) === "overdue")
        .sort((a, b) => new Date(a.next_due_at!).getTime() - new Date(b.next_due_at!).getTime());

    const history = vaccinations
        .filter((v) => getVaccinationStatus(v) === "completed")
        .sort((a, b) => new Date(b.administered_at).getTime() - new Date(a.administered_at).getTime());

    const del = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("vaccinations").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["vaccinations"] }); toast.success("Removed"); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
        onSettled: () => setConfirmId(null),
    });

    const confirmItem = vaccinations.find((a) => a.id === confirmId);

    return (
        <div className="space-y-5">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link to="/health">Health</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>

                    <BreadcrumbSeparator />

                    <BreadcrumbItem>
                        <BreadcrumbPage>Vaccinations</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <header className="flex items-end justify-between">
                <div>
                    <h1 className="font-display text-3xl">Vaccinations</h1>
                    <p className="text-sm text-muted-foreground">Vaccine records & due dates.</p>
                </div>
                <VaccinationsDialog pets={pets} trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>} />
            </header>

            <Group title="Upcoming" items={upcoming} pets={pets} onDelete={setConfirmId} />
            <Group title="Overdue" items={overdue} pets={pets} onDelete={setConfirmId} />
            <Group title="Completed" items={history} pets={pets} onDelete={setConfirmId} />

            <ConfirmDialog
                open={!!confirmId}
                onOpenChange={(o) => !o && setConfirmId(null)}
                title={`Remove ${confirmItem?.vaccine_name ?? "this vaccine"}?`}
                description="This vaccine record will be permanently deleted. This can't be undone."
                confirmText="Remove"
                loading={del.isPending}
                confirmVariant="destructive"
                onConfirm={() => confirmId && del.mutate(confirmId)}
            />
        </div>
    );
}

function Group({ title, items, pets, onDelete }: {
    title: string;
    items: Vaccination[];
    pets: { id: string; name: string }[];
    onDelete: (id: string) => void;
}) {

    const emptyMessage =
        title === "Upcoming"
            ? "No upcoming vaccines."
            : title === "Overdue"
                ? "No overdue vaccines."
                : "No completed vaccines yet.";

    return (
        <section>
            <h2 className="font-display text-lg mb-2">{title}</h2>
            {items.length === 0 ? (
                <div className="rounded-3xl bg-card p-5 text-sm text-muted-foreground shadow-(--shadow-soft)">
                    {emptyMessage}
                </div>
            ) : (
                <ul className="rounded-3xl bg-card divide-y divide-border/60 shadow-(--shadow-soft)">
                    {items.map((v) => {
                        const pet = pets.find((p) => p.id === v.pet_id);
                        const tone = getVaccinationTone(
                            v.next_due_at,
                            v.completed_at,
                        );

                        return (
                            <li key={v.id} className="p-4 flex flex-col">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className={"font-medium text-sm capitalize"}>
                                            {v.vaccine_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground capitalize">
                                            {pet?.name ?? "—"}
                                            {v.administered_by ? ` · ${v.administered_by}` : ""}
                                        </div>

                                        <div className="text-xs text-muted-foreground">
                                            Given{" "}
                                            {new Date(v.administered_at).toLocaleDateString()}
                                        </div>

                                        {v.next_due_at && (
                                            <div className="text-xs text-muted-foreground">
                                                Due{" "}
                                                {new Date(v.next_due_at).toLocaleDateString()}
                                            </div>
                                        )}

                                        {v.notes && (
                                            <p className="text-xs text-muted-foreground mt-1 capitalize">
                                                {v.notes}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 self-start">
                                        <VaccinationsDialog
                                            pets={pets}
                                            item={v}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Edit vaccination">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(v.id)}
                                            className="text-muted-foreground hover:text-destructive"
                                            aria-label="Delete vaccination"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <span className={`text-xs self-end -mt-4 ${getVaccinationToneClass(tone)}`}>
                                    {getVaccinationToneLabel(tone)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

function VaccinationsDialog({ pets, item, trigger }: { pets: { id: string; name: string }[]; item?: Vaccination; trigger: React.ReactNode }) {
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

    const save = useMutation({
        mutationFn: async () => {
            const data = form.getValidated();

            if (!data) {
                toast.error("Fix validation errors first");
                return;
            }
            const payload = {
                pet_id: data.pet_id,
                vaccine_name: data.vaccine_name.trim(),
                administered_at: new Date(data.administered_at).toISOString(),
                next_due_at: data.completed_at
                    ? null
                    : data.next_due_at
                        ? new Date(data.next_due_at).toISOString()
                        : null,
                completed_at: data.completed_at ? new Date(data.completed_at).toISOString() : null,
                administered_by: data.administered_by || null,
                notes: data.notes || null,
            };

            const query = item
                ? supabase.from("vaccinations").update(payload).eq("id", item.id)
                : supabase.from("vaccinations").insert(payload);

            const { error } = await query;

            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["vaccinations"] });
            toast.success(isEdit ? "Updated" : "Vaccination saved");
            setOpen(false);
            if (!isEdit) resetForm();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    });

    if (pets.length === 0 && !isEdit) return <Button disabled variant="outline" className="rounded-full">Add a pet first</Button>;

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="rounded-3xl">
                <DialogHeader><DialogTitle className="font-display">{isEdit ? "Edit vaccination" : "New vaccination"}</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
                    <Field label="Pet">
                        <Select value={form.values.pet_id} onValueChange={(v) => form.setField("pet_id", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </Field>
                    <Field label="Vaccine">
                        <Input type="text" value={form.values.vaccine_name} onChange={(e) => form.setField("vaccine_name", e.target.value)} required />
                    </Field>
                    <Field label="Administered on">
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
                                onClick={() => form.setField("completed_at", form.values.completed_at ? "" : new Date().toISOString())}
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
            </DialogContent>
        </Dialog>
    );
}