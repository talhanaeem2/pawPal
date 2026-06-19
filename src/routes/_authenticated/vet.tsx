import { createFileRoute, ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, vetQuery } from "@/lib/pet-queries";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import Loader from "@/components/ui/loader";
import ErrorState from "@/components/ui/error-state";
import NotFoundState from "@/components/ui/not-found-state";

export const Route = createFileRoute("/_authenticated/vet")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(petsQuery);
    context.queryClient.ensureQueryData(vetQuery);
  },
  pendingComponent: () => <Loader />,
  head: () => ({ meta: [{ title: "Vet · Pawpal" }] }),
  component: VetPage,
  errorComponent: () => ({ reset }: ErrorComponentProps) => <ErrorState onRetry={reset} />,
  notFoundComponent: () => () => <NotFoundState />,
});

function VetPage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: appts } = useSuspenseQuery(vetQuery);
  const qc = useQueryClient();
  const now = Date.now();
  const upcoming = appts.filter((a) => !a.completed && new Date(a.date).getTime() >= now - 86_400_000);
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vet_appointments"] }),
  });

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Vet</h1>
          <p className="text-sm text-muted-foreground">Appointments & history.</p>
        </div>
        <VetDialog pets={pets} />
      </header>

      <Group title="Upcoming" items={upcoming} pets={pets} onToggle={(a) => toggle.mutate(a)} onDelete={(id) => del.mutate(id)} />
      <Group title="History" items={past} pets={pets} onToggle={(a) => toggle.mutate(a)} onDelete={(id) => del.mutate(id)} muted />
    </div>
  );
}

function Group({ title, items, pets, onToggle, onDelete, muted }: {
  title: string;
  items: { id: string; pet_id: string; date: string; reason: string; vet_name: string | null; notes: string | null; completed: boolean }[];
  pets: { id: string; name: string }[];
  onToggle: (a: { id: string; completed: boolean }) => void;
  onDelete: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <section>
      <h2 className="font-display text-lg mb-2">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-3xl bg-card p-5 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
          {muted ? "Nothing yet." : "Nothing scheduled."}
        </div>
      ) : (
        <ul className="rounded-3xl bg-card divide-y divide-border/60 shadow-[var(--shadow-soft)]">
          {items.map((a) => {
            const pet = pets.find((p) => p.id === a.pet_id);
            return (
              <li key={a.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${a.completed ? "line-through text-muted-foreground" : ""}`}>{a.reason}</div>
                  <div className="text-xs text-muted-foreground">
                    {pet?.name ?? "—"} · {new Date(a.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {a.vet_name ? ` · ${a.vet_name}` : ""}
                  </div>
                  {a.notes && <p className="text-xs text-muted-foreground mt-1">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onToggle({ id: a.id, completed: a.completed })}
                    className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground hover:opacity-80">
                    {a.completed ? "Reopen" : "Done"}
                  </button>
                  <button onClick={() => onDelete(a.id)} className="text-muted-foreground hover:text-destructive p-1.5">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function VetDialog({ pets }: { pets: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ pet_id: pets[0]?.id ?? "", date: "", reason: "", vet_name: "", notes: "" });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vet_appointments").insert({
        pet_id: form.pet_id,
        date: new Date(form.date).toISOString(),
        reason: form.reason.trim(),
        vet_name: form.vet_name || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vet_appointments"] });
      toast.success("Appointment saved");
      setOpen(false);
      setForm({ ...form, date: "", reason: "", vet_name: "", notes: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (pets.length === 0) return <Button disabled variant="outline" className="rounded-full">Add a pet first</Button>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-display">New appointment</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.reason || !form.date) return; add.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pet</Label>
            <Select value={form.pet_id} onValueChange={(v) => setForm({ ...form, pet_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">When</Label>
            <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Reason</Label>
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Annual checkup" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Vet / clinic</Label>
            <Input value={form.vet_name} onChange={(e) => setForm({ ...form, vet_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={add.isPending}>
            {add.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
