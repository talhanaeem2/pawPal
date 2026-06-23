import { createFileRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { petsQuery, type Pet } from "@/lib/pet-queries";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import NotFoundState from "@/components/ui/not-found-state";
import InlineLoader from "@/components/ui/inline-loader";
import InlineErrorState from "@/components/ui/inline-error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PetAvatar } from "@/components/ui/pet-avatar";

export const Route = createFileRoute("/_authenticated/pets")({
  loader: ({ context }) => context.queryClient.ensureQueryData(petsQuery),
  pendingComponent: () => <InlineLoader />,
  head: () => ({ meta: [{ title: "Pets · Pawpal" }] }),
  component: PetsPage,
  errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
  notFoundComponent: () => <NotFoundState />,
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
        <PetDialog
          trigger={
            <Button className="rounded-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>
          }
        />
      </header>

      {pets.length === 0 ? (
        <div className="rounded-3xl bg-card p-8 text-center shadow-(--shadow-soft)">
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pets").delete().eq("id", pet.id);
      if (error) throw error;
      const path = extractStoragePath(pet.photo_url);
      if (path) {
        const { error: storageError } = await supabase.storage
          .from("pet-photos")
          .remove([path]);
        if (storageError) throw storageError;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pets"] }); toast.success(`${pet.name} removed`); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete"),
    onSettled: () => setConfirmOpen(false),
  });

  const age = pet.birthdate
    ? Math.max(0, Math.floor((Date.now() - new Date(pet.birthdate).getTime()) / 31557600000))
    : null;

  return (
    <li className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <PetAvatar pet={pet} />
          <div>
            <div className="font-display text-xl leading-tight">{pet.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {pet.breed ?? pet.species}
              {age !== null ? ` · ${age}y` : ""}
              {pet.weight_kg ? ` · ${pet.weight_kg}kg` : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <PetDialog
            pet={pet}
            trigger={
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Edit pet">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfirmOpen(true)}
            className="text-muted-foreground hover:text-destructive"
            aria-label="Delete pet"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={`Remove ${pet.name}?`}
            description={`This will permanently delete ${pet.name} and all related schedule, vet, and activity records. This can't be undone.`}
            confirmText="Remove"
            loading={del.isPending}
            confirmVariant="destructive"
            onConfirm={() => del.mutate()}
          />
        </div>
      </div>
      {pet.notes && <p className="text-sm text-muted-foreground mt-3">{pet.notes}</p>}
    </li>
  );
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

function emptyForm() {
  return { name: "", species: "dog", breed: "", birthdate: "", weight_kg: "", notes: "" };
}

function formFromPet(pet: Pet) {
  return {
    name: pet.name ?? "",
    species: pet.species ?? "dog",
    breed: pet.breed ?? "",
    birthdate: pet.birthdate ?? "",
    weight_kg: pet.weight_kg != null ? String(pet.weight_kg) : "",
    notes: pet.notes ?? "",
  };
}

// Extracts the storage object path from a Supabase Storage public URL.
// Handles both URL formats:
//   .../storage/v1/object/public/pet-photos/{path}
//   .../object/public/pet-photos/{path}
function extractStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  const markers = [
    "/storage/v1/object/public/pet-photos/",
    "/object/public/pet-photos/",
  ];
  for (const marker of markers) {
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const withQuery = decodeURIComponent(url.slice(idx + marker.length));
      const path = withQuery.split("?")[0];
      return path;
    }
  }
  return null;
}

function PetDialog({ pet, trigger }: { pet?: Pet; trigger: React.ReactNode }) {
  const isEdit = !!pet;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(pet ? formFromPet(pet) : emptyForm());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(pet?.photo_url ?? null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Image must be under 5MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoRemoved(false);
  }

  function onRemovePhoto(e: React.MouseEvent) {
    e.stopPropagation();
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetForm() {
    setForm(pet ? formFromPet(pet) : emptyForm());
    setPhotoFile(null);
    setPhotoPreview(pet?.photo_url ?? null);
    setPhotoRemoved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadNewPhoto(): Promise<string> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not signed in");

    const ext = photoFile!.name.split(".").pop() || "jpg";
    const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("pet-photos")
      .upload(path, photoFile!, { upsert: false });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("pet-photos").getPublicUrl(path);
    return urlData.publicUrl;
  }

  const save = useMutation({
    mutationFn: async () => {
      setUploading(true);

      // undefined = leave photo_url untouched; null = clear it; string = new photo
      let photo_url: string | null | undefined = undefined;
      if (photoFile) {
        photo_url = await uploadNewPhoto();
      } else if (photoRemoved) {
        photo_url = null;
      }

      const payload = {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed || null,
        birthdate: form.birthdate || null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        notes: form.notes || null,
        ...(photo_url !== undefined ? { photo_url } : {}),
      };

      if (isEdit) {
        const { error } = await supabase.from("pets").update(payload).eq("id", pet!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pets").insert(payload);
        if (error) throw error;
      }

      // Clean up the old photo from storage once the new state is saved,
      // whenever it was replaced or explicitly removed.
      // Clean up the old photo from storage once the new state is saved
      if (isEdit && photo_url !== undefined) {
        const oldPath = extractStoragePath(pet!.photo_url);

        if (oldPath) {
          const { error: storageError } = await supabase.storage
            .from("pet-photos")
            .remove([oldPath]);
          if (storageError) throw storageError;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pets"] });
      toast.success(isEdit ? "Pet updated" : "Pet added");
      setOpen(false);
      if (!isEdit) resetForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSettled: () => setUploading(false),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-display">{isEdit ? `Edit ${pet!.name}` : "New pet"}</DialogTitle></DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); if (!form.name) return; save.mutate(); }} className="space-y-3">
          <div className="flex justify-center">
            <div className="relative h-20 w-20">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-20 w-20 rounded-2xl bg-secondary/60 flex items-center justify-center overflow-hidden group"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
                )}
                <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition flex items-center justify-center">
                  <Camera className="h-5 w-5 text-card opacity-0 group-hover:opacity-100 transition" strokeWidth={1.75} />
                </div>
              </button>
              {photoPreview && (
                <button
                  type="button"
                  onClick={onRemovePhoto}
                  aria-label="Remove photo"
                  className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-(--shadow-soft)"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
          </div>

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
          <Button type="submit" className="w-full rounded-full" disabled={save.isPending || uploading}>
            {save.isPending || uploading ? "Saving…" : isEdit ? "Save changes" : "Save"}
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