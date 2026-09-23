import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Camera, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

import { petQuery, petsQuery } from "@/lib/queries";
import { useZodForm } from "@/hooks/use-zod-form";
import { supabase } from "@/integrations/supabase/client";
import { ageToBirthdate, PET_SPECIES } from "@/lib/pet-utils";
import { capitalize, cn, extractStoragePath } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/common/select";
import { FormDialog } from "@/components/ui/common/form-dialog";
import { Input } from "@/components/ui/common/input";
import { Textarea } from "@/components/ui/common/textarea";
import { DatePicker } from "../common/date-picker";
import { Button } from "@/components/ui/common/button";
import { Field } from "../common/field";
import { PetPhotoCropDialog } from "./pet-photo-crop-dialog";

import { createEmptyPetForm, Pet, petFormSchema, petToForm } from "@/schemas/pets";

interface IPetFormDialog {
    pet?: Pet;
    trigger: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const MAX_SOURCE_PHOTO_BYTES = 15 * 1024 * 1024;

type PendingPhoto = {
    url: string;
};

export function PetFormDialog({ pet, trigger, open: controlledOpen, onOpenChange }: IPetFormDialog) {
    const [internalOpen, setInternalOpen] = useState(false);
    const { user } = useAuth();
    const isEdit = !!pet;
    const qc = useQueryClient();
    const open = controlledOpen ?? internalOpen;
    const form = useZodForm(
        petFormSchema,
        pet ? petToForm(pet) : createEmptyPetForm()
    );
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(pet?.photo_url ?? null);
    const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
    const [photoRemoved, setPhotoRemoved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [useBirthday, setUseBirthday] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
        if (file.size > MAX_SOURCE_PHOTO_BYTES) { toast.error("Image must be under 15MB"); return; }

        if (pendingPhoto?.url) {
            URL.revokeObjectURL(pendingPhoto.url);
        }

        setPendingPhoto({ url: URL.createObjectURL(file) });
        e.target.value = "";
    }

    function onRemovePhoto(e: React.MouseEvent) {
        e.stopPropagation();
        revokeObjectUrl(photoPreview);
        setPhotoFile(null);
        setPhotoPreview(null);
        setPhotoRemoved(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function discardPendingPhoto() {
        if (pendingPhoto?.url) {
            URL.revokeObjectURL(pendingPhoto.url);
        }
        setPendingPhoto(null);
    }

    function useCroppedPhoto(file: File) {
        discardPendingPhoto();
        revokeObjectUrl(photoPreview);
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        setPhotoRemoved(false);
    }

    function handleOpenChange(o: boolean) {
        setInternalOpen(o);
        onOpenChange?.(o);
        if (!o) resetForm();
    }

    function resetForm() {
        form.reset(pet ? petToForm(pet) : createEmptyPetForm());
        discardPendingPhoto();
        revokeObjectUrl(photoPreview);
        setPhotoFile(null);
        setPhotoPreview(pet?.photo_url ?? null);
        setPhotoRemoved(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }


    async function uploadNewPhoto(): Promise<string> {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("pet-photos").upload(path, photoFile!, {
            upsert: false,
            contentType: "image/jpeg",
            cacheControl: "31536000",
        });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("pet-photos").getPublicUrl(path);
        return urlData.publicUrl;
    }

    const save = useMutation({
        mutationFn: async () => {
            const data = form.getValidated();
            console.log(data)
            if (!data) return;

            setUploading(true);
            let photo_url: string | null | undefined = undefined;
            if (photoFile) photo_url = await uploadNewPhoto();
            else if (photoRemoved) photo_url = null;

            const birthdate = useBirthday
                ? data.birthdate
                : ageToBirthdate(data.age_years, data.age_months);

            const payload = {
                name: data.name.trim().replace(/\s+/g, " "),
                species: data.species === "other"
                    ? data.other_species.trim().replace(/\s+/g, " ").toLowerCase()
                    : data.species.toLowerCase(),
                pet_type: data.pet_type,
                group_size: data.pet_type === "group" && data.group_size
                    ? Number(data.group_size)
                    : null,
                breed: data.pet_type === "group" ? null : (data.breed || null),
                birthdate: data.pet_type === "group" ? null : birthdate,
                weight_kg: data.pet_type === "group"
                    ? null
                    : (data.weight_kg ? Number(data.weight_kg) : null),
                notes: data.notes || null,
                gender: data.pet_type === "group" ? null : data.gender,
                neutered: data.pet_type === "group" ? false : data.neutered,
                microchip: data.pet_type === "group" ? null : (data.microchip || null),
                ...(photo_url !== undefined ? { photo_url } : {}),
            };

            const query = pet
                ? supabase.from("pets").update(payload).eq("id", pet.id)
                : supabase.from("pets").insert(payload);

            const { error } = await query;

            if (error) throw error;

            if (isEdit && photo_url !== undefined) {
                const oldPath = extractStoragePath(pet!.photo_url, "pet-photos");
                if (oldPath) await supabase.storage.from("pet-photos").remove([oldPath]);
            }
        },
        onSuccess: async () => {
            const invalidations = [
                qc.invalidateQueries({ queryKey: petsQuery.queryKey }),
            ];

            if (isEdit) {
                invalidations.push(
                    qc.invalidateQueries({ queryKey: petQuery(pet.id).queryKey })
                );
            }
            await Promise.all(invalidations);
            toast.success(isEdit ? "Pet updated" : "Pet added");
            handleOpenChange(false);
            if (!isEdit) resetForm();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
        onSettled: () => setUploading(false),
    });

    return (
        <>
            <PetPhotoCropDialog
                open={pendingPhoto !== null}
                imageUrl={pendingPhoto?.url ?? ""}
                onCancel={discardPendingPhoto}
                onComplete={useCroppedPhoto}
            />

            <FormDialog
                open={open}
                onOpenChange={handleOpenChange}
                title={isEdit ? `Edit ${pet!.name}` : form.values.pet_type === "group" ? "New group" : "New pet"}
                trigger={trigger}
            >
                <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
                    {/* Photo */}
                    <div className="flex justify-center">
                        <div className="relative h-20 w-20">
                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                className="h-20 w-20 rounded-2xl bg-secondary/60 flex items-center justify-center overflow-hidden group">
                                {photoPreview
                                    ? <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                                    : <Camera className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />}
                                <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition flex items-center justify-center">
                                    <Camera className="h-5 w-5 text-card opacity-0 group-hover:opacity-100 transition" strokeWidth={1.75} />
                                </div>
                            </button>
                            {photoPreview && (
                                <button type="button" onClick={onRemovePhoto} aria-label="Remove photo"
                                    className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-(--shadow-soft)">
                                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={onPickPhoto}
                            className="hidden"
                        />
                    </div>
                    <p className="-mt-1 text-center text-xs text-muted-foreground">
                        Choose a photo, then crop and zoom it to fit.
                    </p>

                    {/* Individual / Group toggle */}
                    {!isEdit && (
                        <div className="flex rounded-full bg-secondary/60 p-1">
                            <button
                                type="button"
                                onClick={() => form.setField("pet_type", "individual")}
                                className={cn(
                                    "flex-1 rounded-full py-1.5 text-sm font-medium transition",
                                    form.values.pet_type === "individual"
                                        ? "bg-card shadow-sm"
                                        : "text-muted-foreground",
                                )}
                            >
                                Individual
                            </button>
                            <button
                                type="button"
                                onClick={() => form.setField("pet_type", "group")}
                                className={cn(
                                    "flex-1 rounded-full py-1.5 text-sm font-medium transition",
                                    form.values.pet_type === "group"
                                        ? "bg-card shadow-sm"
                                        : "text-muted-foreground",
                                )}
                            >
                                Group
                            </button>
                        </div>
                    )}

                    {/* Basic info */}
                    <div className="grid grid-cols-2 gap-3">
                        <Field
                            label={form.values.pet_type === "group" ? "Group name" : "Name"}
                            error={form.errors.name}
                        >
                            <Input
                                value={form.values.name}
                                onChange={(e) => form.setField("name", e.target.value)}
                                placeholder={form.values.pet_type === "group" ? "e.g. Backyard Aviary" : "e.g. Bruno"}
                                required
                            />
                        </Field>
                        <Field label="Animal" error={form.errors.species}>
                            <Select
                                value={form.values.species}
                                onValueChange={(v) => form.setField("species", v)}
                                required
                            >
                                <SelectTrigger><SelectValue placeholder="Choose an animal" /></SelectTrigger>
                                <SelectContent>
                                    {PET_SPECIES.map((s) =>
                                        <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>)
                                    }
                                </SelectContent>
                            </Select>
                        </Field>
                        {form.values.pet_type === "group" && (
                            <Field label="How many?" error={form.errors.group_size} className="col-span-2">
                                <Input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={form.values.group_size}
                                    onChange={(e) => form.setField("group_size", e.target.value)}
                                    placeholder="e.g. 42"
                                    required
                                />
                            </Field>
                        )}
                        {form.values.species === "other" && (
                            <Field label="What animal is it?" className="col-span-2">
                                <Input
                                    value={form.values.other_species}
                                    onChange={(e) => form.setField("other_species", e.target.value)}
                                    placeholder="e.g. Turtle"
                                    required={form.values.species === "other"}
                                />
                            </Field>
                        )}
                        {showMore && (
                            <>
                                {form.values.pet_type === "individual" && (
                                    <>
                                        <Field label="Type / Breed">
                                            <Input value={form.values.breed} onChange={(e) => form.setField("breed", e.target.value)} placeholder="e.g. Labrador, Persian, Mixed" />
                                        </Field>
                                        <Field label="Weight (kg)">
                                            <Input type="number" step="0.1" value={form.values.weight_kg} onChange={(e) => form.setField("weight_kg", e.target.value)} placeholder="e.g. 25.5" />
                                        </Field>
                                        <div className="col-span-2">
                                            {useBirthday ? (
                                                <Field label="Birthdate" className="col-span-2">
                                                    <DatePicker
                                                        value={form.values.birthdate}
                                                        onChange={(date) => form.setField("birthdate", date)}
                                                        placeholder="Select date"
                                                    />
                                                </Field>
                                            ) : (
                                                <Field label="Age" className="col-span-2">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={50}
                                                                placeholder="Years (e.g. 3)"
                                                                value={form.values.age_years}
                                                                onChange={(e) =>
                                                                    form.setField("age_years", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                        <div>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={11}
                                                                placeholder="Months (e.g. 6)"
                                                                value={form.values.age_months}
                                                                onChange={(e) =>
                                                                    form.setField("age_months", e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </Field>
                                            )}
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="col-span-2 justify-start"
                                                onClick={() => setUseBirthday(!useBirthday)}
                                            >
                                                {useBirthday
                                                    ? "Use age instead"
                                                    : "Enter birthday instead"}
                                            </Button>
                                        </div>
                                        <Field label="Gender">
                                            <Select value={form.values.gender ?? ""} onValueChange={(v) => form.setField("gender", v as "male" | "female")}>
                                                <SelectTrigger><SelectValue placeholder="Choose a gender" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">Male</SelectItem>
                                                    <SelectItem value="female">Female</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                        <Field label={form.values.gender === "female" ? "Spayed" : "Neutered"}>
                                            <div className="flex items-center h-10 gap-2">
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={form.values.neutered}
                                                    onClick={() => form.setField("neutered", !form.values.neutered)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${form.values.neutered ? "bg-primary" : "bg-input"}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.values.neutered ? "translate-x-6" : "translate-x-1"}`} />
                                                </button>
                                                <span className="text-sm text-muted-foreground">{form.values.neutered ? "Yes" : "No"}</span>
                                            </div>
                                        </Field>
                                        <Field label="Microchip ID" className="col-span-2">
                                            <Input value={form.values.microchip} onChange={(e) => form.setField("microchip", e.target.value)} placeholder="e.g. 981000123456789" />
                                        </Field>
                                    </>
                                )}
                                <Field className="col-span-2" label="Notes">
                                    <Textarea
                                        rows={3}
                                        value={form.values.notes}
                                        onChange={(e) => form.setField("notes", e.target.value)}
                                        placeholder={
                                            form.values.pet_type === "group"
                                                ? "Enclosure details, feeding routine, anything you'd like to remember"
                                                : "Anything you'd like to remember about your pet"
                                        }
                                    />
                                </Field>
                            </>
                        )}
                        <Button
                            type="button"
                            variant="link"
                            onClick={() => setShowMore((v) => !v)}
                            className="col-span-2 justify-start"
                        >
                            {showMore ? "Hide details" : "More details (optional)"}
                        </Button>
                    </div>
                    <Button type="submit" className="w-full rounded-full" disabled={save.isPending || uploading}>
                        {save.isPending || uploading
                            ? "Saving…"
                            : isEdit
                                ? "Save changes"
                                : form.values.pet_type === "group"
                                    ? "Add group"
                                    : "Add pet"}
                    </Button>
                </form>
            </FormDialog>
        </>
    );
}

function revokeObjectUrl(url: string | null) {
    if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
    }
}
