import { createFileRoute, Link, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, vetQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
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
import { createEmptyVetAppointmentForm, VetAppointment, vetAppointmentFormSchema, vetAppointmentToForm } from "@/schemas/vet";
import { useZodForm } from "@/hooks/use-zod-form";
import { Field } from "@/components/ui/field";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import z from "zod";

export const Route = createFileRoute("/_authenticated/health/vet")({
  validateSearch: z.object({
    new: z.boolean().optional(),
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(petsQuery);
    context.queryClient.ensureQueryData(vetQuery);
  },
  pendingComponent: () => <InlineLoader />,
  head: () => ({ meta: [{ title: "Vet · Pawpal" }] }),
  component: VetPage,
  errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
  notFoundComponent: () => <NotFoundState />,
});

function VetPage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: appts } = useSuspenseQuery(vetQuery);
  const qc = useQueryClient();
  const { new: openCreate } = Route.useSearch();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const now = Date.now();
  const upcoming = appts
    .filter((a) => !a.completed && new Date(a.date).getTime() >= now - 86_400_000)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = appts.filter((a) => a.completed || new Date(a.date).getTime() < now - 86_400_000);

  const toggle = useMutation({
    mutationFn: async (a: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("vet_appointments").update({ completed: !a.completed }).eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vet_appointments"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vet_appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["vet_appointments"] }); toast.success("Removed"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSettled: () => setConfirmId(null),
  });

  const confirmItem = appts.find((a) => a.id === confirmId);

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
            <BreadcrumbPage>Vet</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Vet</h1>
          <p className="text-sm text-muted-foreground">Appointments & history.</p>
        </div>
        <VetDialog
          pets={pets}
          initialOpen={openCreate}
          trigger={<Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>}
        />
      </header>

      <Group title="Upcoming" items={upcoming} pets={pets} onToggle={(a) => toggle.mutate(a)} onDelete={setConfirmId} />
      <Group title="History" items={past} pets={pets} onToggle={(a) => toggle.mutate(a)} onDelete={setConfirmId} muted />

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title={`Remove ${confirmItem?.reason ?? "this appointment"}?`}
        description="This appointment will be permanently deleted. This can't be undone."
        confirmText="Remove"
        loading={del.isPending}
        confirmVariant="destructive"
        onConfirm={() => confirmId && del.mutate(confirmId)}
      />
    </div>
  );
}

function Group({ title, items, pets, onToggle, onDelete, muted }: {
  title: string;
  items: VetAppointment[];
  pets: { id: string; name: string }[];
  onToggle: (a: { id: string; completed: boolean }) => void;
  onDelete: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="font-display text-lg mb-2">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-3xl bg-card p-5 text-sm text-muted-foreground shadow-(--shadow-soft)">
          {muted ? "Nothing yet." : "Nothing scheduled."}
        </div>
      ) : (
        <ul className="rounded-3xl bg-card divide-y divide-border/60 shadow-(--shadow-soft)">
          {items.map((a) => {
            const pet = pets.find((p) => p.id === a.pet_id);
            return (
              <li key={a.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm capitalize ${a.completed ? "line-through text-muted-foreground" : ""}`}>{a.reason}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {pet?.name ?? "—"} · {new Date(a.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {a.vet_name ? ` · ${a.vet_name}` : ""}
                  </div>
                  {a.notes && <p className="text-xs text-muted-foreground mt-1 capitalize">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onToggle({ id: a.id, completed: a.completed })}
                    className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground hover:opacity-80">
                    {a.completed ? "Reopen" : "Done"}
                  </button>
                  <VetDialog
                    pets={pets}
                    item={a}
                    trigger={
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Edit appointment">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(a.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete appointment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function VetDialog({ pets, item, trigger, initialOpen }: { pets: { id: string; name: string }[]; item?: VetAppointment; trigger: React.ReactNode; initialOpen?: boolean }) {
  const isEdit = !!item;
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
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
      qc.invalidateQueries({ queryKey: ["vet_appointments"] });
      toast.success(isEdit ? "Updated" : "Appointment saved");
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
        <DialogHeader><DialogTitle className="font-display">{isEdit ? "Edit appointment" : "New appointment"}</DialogTitle></DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}