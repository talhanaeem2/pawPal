import { createFileRoute, Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { dewormingsQuery, petsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, ShieldPlus } from "lucide-react";
import { toast } from "sonner";

import NotFoundState from "@/components/ui/not-found-state";
import InlineLoader from "@/components/ui/inline-loader";
import InlineErrorState from "@/components/ui/inline-error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useZodForm } from "@/hooks/use-zod-form";
import { Field } from "@/components/ui/field";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import z from "zod";
import { createEmptyDewormingForm, Deworming, dewormingFormSchema, dewormingToForm } from "@/schemas/deworming";
import { getDewormingDueTone, getDewormingDueToneClass, getDewormingDueToneLabel } from "@/lib/utils";
import { FeatureEmptyState } from "@/components/ui/feature-empty-state";
import { Page } from "@/components/layout/page";

export const Route = createFileRoute("/_authenticated/health/deworming")({
    validateSearch: z.object({
        new: z.boolean().optional(),
    }),
    loader: ({ context }) => {
        context.queryClient.ensureQueryData(petsQuery);
        context.queryClient.ensureQueryData(dewormingsQuery);
    },
    pendingComponent: () => <InlineLoader />,
    head: () => ({ meta: [{ title: "Deworming · Pawpal" }] }),
    component: DewormingPage,
    errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
    notFoundComponent: () => <NotFoundState />,
});

function DewormingPage() {
    const { data: pets } = useSuspenseQuery(petsQuery);
    const { data: dewormings } = useSuspenseQuery(dewormingsQuery);
    const qc = useQueryClient();
    const { new: openCreate } = Route.useSearch();
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const now = Date.now();

    function getDewormingStatus(d: Deworming) {
        return new Date(d.next_due_at).getTime() < now
            ? "overdue"
            : "upcoming";
    }

    const upcoming = dewormings
        .filter((v) => getDewormingStatus(v) === "upcoming")
        .sort((a, b) => new Date(a.next_due_at!).getTime() - new Date(b.next_due_at!).getTime());

    const overdue = dewormings
        .filter((v) => getDewormingStatus(v) === "overdue")
        .sort((a, b) => new Date(a.next_due_at!).getTime() - new Date(b.next_due_at!).getTime());

    const del = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("dewormings").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["dewormings"] }); toast.success("Removed"); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
        onSettled: () => setConfirmId(null),
    });

    const confirmItem = dewormings.find((a) => a.id === confirmId);

    return (
        <Page>
            <Page.Header>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/health">Health</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>

                        <BreadcrumbSeparator />

                        <BreadcrumbItem>
                            <BreadcrumbPage>Deworming</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <header className="flex items-end justify-between">
                    <div>
                        <h1 className="font-display text-3xl">Dewormings</h1>
                        <p className="text-sm text-muted-foreground">Deworming records & due dates.</p>
                    </div>
                    <DewormingDialog
                        pets={pets}
                        initialOpen={openCreate}
                        trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>}
                    />
                </header>
            </Page.Header>

            <Page.Content>
                {dewormings.length === 0 ? (
                    <FeatureEmptyState
                        icon={ShieldPlus}
                        title="Stay on top of deworming"
                        description="Track treatments and receive reminders when the next dose is due."
                        cta="Add deworming"
                        to="/health/deworming"
                        search={{ new: true }}
                    />
                ) : (

                    <>
                        <Group title="Upcoming" items={upcoming} pets={pets} onDelete={setConfirmId} />
                        <Group title="Overdue" items={overdue} pets={pets} onDelete={setConfirmId} />
                    </>
                )}
            </Page.Content>

            <ConfirmDialog
                open={!!confirmId}
                onOpenChange={(o) => !o && setConfirmId(null)}
                title={`Remove ${confirmItem?.product_name ?? "this deworming"}?`}
                description="This deworming record will be permanently deleted. This can't be undone."
                confirmText="Remove"
                loading={del.isPending}
                confirmVariant="destructive"
                onConfirm={() => confirmId && del.mutate(confirmId)}
            />
        </Page>
    );
}

function Group({ title, items, pets, onDelete }: {
    title: string;
    items: Deworming[];
    pets: { id: string; name: string }[];
    onDelete: (id: string) => void;
}) {

    const emptyMessage =
        title === "Upcoming"
            ? "No upcoming dewormings."
            : title === "Overdue"
                ? "No overdue dewormings."
                : "No deworming history yet.";

    return (
        <section>
            <h2 className="font-display text-lg mb-2">{title}</h2>
            {items.length === 0 ? (
                <div className="rounded-3xl bg-card p-5 text-sm text-muted-foreground shadow-(--shadow-soft)">
                    {emptyMessage}
                </div>
            ) : (
                <ul className="rounded-3xl bg-card divide-y divide-border/60 shadow-(--shadow-soft)">
                    {items.map((d) => {
                        const pet = pets.find((p) => p.id === d.pet_id);
                        const tone = getDewormingDueTone(d.next_due_at);

                        return (
                            <li key={d.id} className="p-4 flex flex-col">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className={"font-medium text-sm capitalize"}>
                                            {d.product_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground capitalize">
                                            {pet?.name ?? "—"}
                                            {d.administered_by ? ` · ${d.administered_by}` : ""}
                                        </div>

                                        <div className="text-xs text-muted-foreground">
                                            Given{" "}
                                            {new Date(d.administered_at).toLocaleDateString()}
                                        </div>

                                        {d.next_due_at && (
                                            <div className="text-xs text-muted-foreground">
                                                Due{" "}
                                                {new Date(d.next_due_at).toLocaleDateString()}
                                            </div>
                                        )}

                                        {d.notes && (
                                            <p className="text-xs text-muted-foreground mt-1 capitalize">
                                                {d.notes}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 self-start">
                                        <DewormingDialog
                                            pets={pets}
                                            item={d}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Edit deworming">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            }
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(d.id)}
                                            className="text-muted-foreground hover:text-destructive"
                                            aria-label="Delete deworming"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <span className={`text-xs self-end -mt-4 ${getDewormingDueToneClass(tone)}`}>
                                    {getDewormingDueToneLabel(tone)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

function DewormingDialog({ pets, item, trigger, initialOpen }: { pets: { id: string; name: string }[]; item?: Deworming; trigger: React.ReactNode; initialOpen?: boolean }) {
    const isEdit = !!item;
    const qc = useQueryClient();
    const navigate = Route.useNavigate();
    const [open, setOpen] = useState(false);
    const form = useZodForm(
        dewormingFormSchema,
        item ? dewormingToForm(item) : createEmptyDewormingForm(pets[0]?.id)
    );

    function resetForm() {
        form.reset(item ? dewormingToForm(item) : createEmptyDewormingForm(pets[0]?.id));
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
                product_name: data.product_name.trim(),
                administered_at: data.administered_at,
                next_due_at: data.next_due_at,
                administered_by: data.administered_by || null,
                notes: data.notes || null,
            };

            const query = item
                ? supabase.from("dewormings").update(payload).eq("id", item.id)
                : supabase.from("dewormings").insert(payload);

            const { error } = await query;

            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["dewormings"] });
            toast.success(isEdit ? "Updated" : "Deworming saved");
            setOpen(false);
            if (!isEdit) resetForm();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    });

    if (pets.length === 0 && !isEdit) return <Button disabled variant="outline" className="rounded-full">Add a pet first</Button>;

    function clearCreateSearch() {
        if (!isEdit) {
            navigate({
                search: {
                    new: undefined,
                },
                replace: true,
            });
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(o) => {
                setOpen(o);
                if (!o) {
                    resetForm();
                    clearCreateSearch();
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="rounded-3xl">
                <DialogHeader><DialogTitle className="font-display">{isEdit ? "Edit deworming" : "New deworming"}</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
                    <Field label="Pet">
                        <Select value={form.values.pet_id} onValueChange={(v) => form.setField("pet_id", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </Field>
                    <Field label="Product" error={form.errors.product_name}>
                        <Input type="text" value={form.values.product_name} onChange={(e) => form.setField("product_name", e.target.value)} required />
                    </Field>
                    <Field label="Administered on" error={form.errors.administered_at}>
                        <Input type="date" value={form.values.administered_at} onChange={(e) => form.setField("administered_at", e.target.value)} required />
                    </Field>
                    <Field label="Next due" error={form.errors.next_due_at}>
                        <Input type="date" value={form.values.next_due_at} onChange={(e) => form.setField("next_due_at", e.target.value)} required />
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