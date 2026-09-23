import { useMutation } from "@tanstack/react-query";
import { Camera, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { useZodForm } from "@/hooks/use-zod-form";
import { supabase } from "@/integrations/supabase/client";
import { MAX_SOURCE_PHOTO_BYTES, revokeObjectUrl, extractStoragePath } from "@/lib/utils";

import { Field } from "../common/field";
import { FormDialog } from "../common/form-dialog";
import { Input } from "../common/input";
import { UserAvatar } from "../common/user-avatar";
import { Button } from "../common/button";

import { createEmptyProfileForm, Profile, profileFormSchema, profileToForm } from "@/schemas/profile";
import { PhotoCropDialog } from "../common/photo-crop-dialog";

interface IProfileFormDialog {
    profile?: Profile;
    trigger: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

type PendingPhoto = {
    url: string;
};

export function ProfileFormDialog({ profile, trigger, open: controlledOpen, onOpenChange }: IProfileFormDialog) {
    const { refetchProfile, user } = useAuth();
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen ?? internalOpen;
    const form = useZodForm(profileFormSchema, profile ? profileToForm(profile) : createEmptyProfileForm());
    const inputRef = useRef<HTMLInputElement>(null);

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.avatar_url ?? null);
    const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
    const [photoRemoved, setPhotoRemoved] = useState(false);
    const [uploading, setUploading] = useState(false);
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

    useEffect(() => {
        if (!open) return;

        requestAnimationFrame(() => {
            const input = inputRef.current;
            if (!input) return;

            input.focus();

            const length = input.value.length;
            input.setSelectionRange(length, length);
        });
    }, [open]);

    function handleOpenChange(o: boolean) {
        setInternalOpen(o);
        onOpenChange?.(o);
        if (!o) resetForm();
    }

    function resetForm() {
        form.reset(profile ? profileToForm(profile) : createEmptyProfileForm());
        discardPendingPhoto();
        revokeObjectUrl(photoPreview);
        setPhotoFile(null);
        setPhotoPreview(profile?.avatar_url ?? null);
        setPhotoRemoved(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function uploadNewPhoto(): Promise<string> {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, photoFile!,
            {
                upsert: false,
                contentType: "image/jpeg",
                cacheControl: "31536000",
            });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
        return urlData.publicUrl;
    }

    const save = useMutation({
        mutationFn: async () => {
            const data = form.getValidated();

            if (!data) return;

            if (!profile) {
                throw new Error("Profile not found");
            }

            setUploading(true);
            let avatar_url: string | null | undefined = undefined;
            if (photoFile) avatar_url = await uploadNewPhoto();
            else if (photoRemoved) avatar_url = null;

            const payload = {
                display_name: data.display_name,
                notifications_enabled: data.notifications_enabled,
                ...(avatar_url !== undefined ? { avatar_url } : {}),
                // timezone: data.timezone,
                // locale: data.locale,
            };

            const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);

            if (error) throw error;

            if (avatar_url !== undefined) {
                const oldPath = extractStoragePath(profile!.avatar_url, "profile-photos");
                if (oldPath) await supabase.storage.from("profile-photos").remove([oldPath]);
            }
        },
        onSuccess: async () => {
            await refetchProfile();
            toast.success("Profile updated");
            handleOpenChange(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
        onSettled: () => setUploading(false),
    });

    return (
        <>
            <PhotoCropDialog
                open={pendingPhoto !== null}
                imageUrl={pendingPhoto?.url ?? ""}
                onCancel={discardPendingPhoto}
                onComplete={useCroppedPhoto}
            />
            <FormDialog
                open={open}
                onOpenChange={handleOpenChange}
                title="Edit profile"
                trigger={trigger}
            >
                <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
                    <div className="flex justify-center">
                        <div className="relative h-20 w-20">
                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                className="h-24 w-24 flex items-center justify-center overflow-hidden group">
                                {photoPreview
                                    ? <UserAvatar
                                        name={profile?.display_name}
                                        avatarUrl={photoPreview}
                                        className="h-full w-full object-cover"
                                    />
                                    : <Camera className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />}
                                <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/20 transition flex items-center justify-center">
                                    <Camera className="h-5 w-5 text-card opacity-0 group-hover:opacity-100 transition mt-4 ml-4" strokeWidth={1.75} />
                                </div>
                            </button>
                            {photoPreview && (
                                <button type="button" onClick={onRemovePhoto} aria-label="Remove photo"
                                    className="absolute -top-1.5 -right-3 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-(--shadow-soft)">
                                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
                    </div>
                    <Field label="Display Name" error={form.errors.display_name}>
                        <Input ref={inputRef} type="text" value={form.values.display_name} onChange={(e) => form.setField("display_name", e.target.value)} required />
                    </Field>
                    <Field label="Notifications">
                        <div className="flex items-center h-10 gap-2">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={form.values.notifications_enabled}
                                onClick={() =>
                                    form.setField(
                                        "notifications_enabled",
                                        !form.values.notifications_enabled
                                    )
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${form.values.notifications_enabled
                                    ? "bg-primary"
                                    : "bg-input"
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.values.notifications_enabled
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                        }`}
                                />
                            </button>

                            <span className="text-sm text-muted-foreground">
                                {form.values.notifications_enabled ? "Enabled" : "Disabled"}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Receive reminders and other updates
                        </p>
                    </Field>
                    <Button type="submit" className="w-full rounded-full" disabled={save.isPending || uploading}>
                        {save.isPending || uploading ? "Saving…" : "Save changes"}
                    </Button>
                </form>
            </FormDialog>
        </>
    );
}