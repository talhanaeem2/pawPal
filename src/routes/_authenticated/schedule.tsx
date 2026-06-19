import { createFileRoute, ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, scheduleQuery, type ScheduleItem } from "@/lib/pet-queries";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";

import Loader from "@/components/ui/loader";
import ErrorState from "@/components/ui/error-state";
import NotFoundState from "@/components/ui/not-found-state";

export const Route = createFileRoute("/_authenticated/schedule")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(petsQuery);
    context.queryClient.ensureQueryData(scheduleQuery);
  },
  pendingComponent: () => <Loader />,
  head: () => ({ meta: [{ title: "Schedule · Pawpal" }] }),
  component: SchedulePage,
  errorComponent: ({ reset }: ErrorComponentProps) => <ErrorState onRetry={reset} />,
  notFoundComponent: () => <NotFoundState />,
});

function SchedulePage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  const { data: items } = useSuspenseQuery(scheduleQuery);
  const qc = useQueryClient();

  const mark = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_items").update({ last_done_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schedule_items"] }); toast.success("Marked done"); },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule_items"] }),
  });

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Schedule</h1>
          <p className="text-sm text-muted-foreground">Meals, meds & routines.</p>
        </div>
        <ScheduleDialog pets={pets} />
      </header>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-card p-8 text-center shadow-(--shadow-soft)">
          <p className="text-sm text-muted-foreground">Nothing scheduled. Add a meal or medication.</p>
        </div>
      ) : (
        <ul className="rounded-3xl bg-card divide-y divide-border/60 shadow-(--shadow-soft)">
          {items.map((s) => {
            const pet = pets.find((p) => p.id === s.pet_id);
            const doneToday = s.last_done_at && new Date(s.last_done_at).toDateString() === new Date().toDateString();
            return (
              <li key={s.id} className="p-4 flex items-center gap-3">
                <button onClick={() => mark.mutate(s.id)}
                  className={`h-9 w-9 rounded-full border flex items-center justify-center transition ${doneToday ? "bg-primary border-primary text-primary-foreground" : "border-border hover:bg-accent/40"
                    }`}>
                  <Check className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{s.title}</div>
                  <div className="text-xs text-muted-foreground capitalize truncate">
                    {pet?.name ?? "—"} · {s.kind} · {s.time_of_day?.slice(0, 5) ?? s.frequency}
                    {s.dosage ? ` · ${s.dosage}` : ""}
                  </div>
                </div>
                <button onClick={() => del.mutate(s.id)} className="text-muted-foreground hover:text-destructive p-1.5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ScheduleDialog({ pets }: { pets: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ pet_id: pets[0]?.id ?? "", kind: "feeding", title: "", time_of_day: "", frequency: "daily", dosage: "" });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedule_items").insert({
        pet_id: form.pet_id,
        kind: form.kind,
        title: form.title.trim(),
        time_of_day: form.time_of_day || null,
        frequency: form.frequency,
        dosage: form.dosage || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedule_items"] });
      toast.success("Added");
      setOpen(false);
      setForm({ ...form, title: "", time_of_day: "", dosage: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (pets.length === 0) {
    return <Button disabled variant="outline" className="rounded-full">Add a pet first</Button>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-display">New reminder</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.title || !form.pet_id) return; add.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Pet</Label>
            <Select value={form.pet_id} onValueChange={(v) => setForm({ ...form, pet_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{pets.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="feeding">Feeding</SelectItem>
                  <SelectItem value="medication">Medication</SelectItem>
                  <SelectItem value="grooming">Grooming</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="as_needed">As needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Morning kibble" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Time</Label>
              <Input type="time" value={form.time_of_day} onChange={(e) => setForm({ ...form, time_of_day: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Dose / amount</Label>
              <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="1 cup" />
            </div>
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={add.isPending}>
            {add.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// silence unused-type warning
export type _Si = ScheduleItem;
