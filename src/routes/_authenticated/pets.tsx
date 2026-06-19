import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, speciesEmoji, type Pet } from "@/lib/pet-queries";
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

export const Route = createFileRoute("/_authenticated/pets")({
  loader: ({ context }) => context.queryClient.ensureQueryData(petsQuery),
  head: () => ({ meta: [{ title: "Pets · Pawpal" }] }),
  component: PetsPage,
  errorComponent: () => <p className="text-sm text-destructive">Something went wrong. Please try again.</p>,
  notFoundComponent: () => <p>Not found.</p>,
});

function PetsPage() {
  const { data: pets } = useSuspenseQuery(petsQuery);
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl">Pets</h1>
          <p className="text-sm text-muted-foreground">Your little household.</p>
        </div>
        <PetDialog />
      </header>

      {pets.length === 0 ? (
        <div className="rounded-3xl bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="text-sm text-muted-foreground">No pets yet. Add one to get started.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {pets.map((p) => <PetCard key={p.id} pet={p} />)}
        </ul>
      )}
    </div>
  );
}

function PetCard({ pet }: { pet: Pet }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pets").delete().eq("id", pet.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pets"] }); toast.success(`${pet.name} removed`); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
  });

  const age = pet.birthdate
    ? Math.max(0, Math.floor((Date.now() - new Date(pet.birthdate).getTime()) / 31557600000))
    : null;

  return (
    <li className="rounded-3xl bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-secondary/60 flex items-center justify-center text-3xl">
            {speciesEmoji(pet.species)}
          </div>
          <div>
            <div className="font-display text-xl leading-tight">{pet.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {pet.breed ?? pet.species}
              {age !== null ? ` · ${age}y` : ""}
              {pet.weight_kg ? ` · ${pet.weight_kg}kg` : ""}
            </div>
          </div>
        </div>
        <button onClick={() => confirm(`Remove ${pet.name}?`) && del.mutate()}
          className="text-muted-foreground hover:text-destructive p-1.5">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {pet.notes && <p className="text-sm text-muted-foreground mt-3">{pet.notes}</p>}
    </li>
  );
}

function PetDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", species: "dog", breed: "", birthdate: "", weight_kg: "", notes: "" });

  const add = useMutation({
    mutationFn: async () => {
      // const { data: u } = await supabase.auth.getUser();
      // if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("pets").insert({
        name: form.name.trim(),
        species: form.species,
        breed: form.breed || null,
        birthdate: form.birthdate || null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pets"] });
      toast.success("Pet added");
      setOpen(false);
      setForm({ name: "", species: "dog", breed: "", birthdate: "", weight_kg: "", notes: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-display">New pet</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.name) return; add.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Species">
              <Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["dog", "cat", "rabbit", "bird", "fish", "reptile", "hamster", "other"].map((s) =>
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Breed"><Input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} /></Field>
            <Field label="Weight (kg)"><Input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} /></Field>
            <Field label="Birthdate" className="col-span-2"><Input type="date" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <Button type="submit" className="w-full rounded-full" disabled={add.isPending}>
            {add.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
