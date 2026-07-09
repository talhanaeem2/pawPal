import { Page } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import InlineErrorState from "@/components/ui/inline-error-state";
import InlineLoader from "@/components/ui/inline-loader";
import { Input } from "@/components/ui/input";
import NotFoundState from "@/components/ui/not-found-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/contexts/auth-context";
import { useZodForm } from "@/hooks/use-zod-form";
import { supabase } from "@/integrations/supabase/client";
import { extractStoragePath } from "@/lib/utils";
import { Profile, profileFormSchema, profileToForm } from "@/schemas/profile";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, ErrorComponentProps } from "@tanstack/react-router";
import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
    pendingComponent: () => <InlineLoader />,
    head: () => ({ meta: [{ title: "Profile · Pawpal" }] }),
    component: ProfilePage,
    errorComponent: ({ reset }: ErrorComponentProps) => <InlineErrorState onRetry={reset} />,
    notFoundComponent: () => <NotFoundState />,
});

function ProfilePage() {
    const { profile, user, signOut, signingOut } = useAuth();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteText, setDeleteText] = useState("");

    const deleteAccount = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.functions.invoke("delete-account");

            if (error) throw error;

            try {
                await supabase.auth.signOut();
            } catch { }
        },

        onSuccess: () => {
            setDeleteOpen(false);
            setDeleteText("");
            toast.success("Account deleted");
        },

        onError: (e) => {
            toast.error(e instanceof Error ? e.message : "Failed to delete account");
        },
    });

    return (
        <Page>
            <Page.Header>
                <header>
                    <h1 className="font-display text-3xl">Profile</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your account preferences.
                    </p>
                </header>

                <section className="rounded-3xl bg-card p-8 shadow-(--shadow-soft)">
                    <div className="flex flex-col items-center text-center mb-4">
                        <div className="relative">
                            <UserAvatar
                                name={profile.display_name}
                                avatarUrl={profile.avatar_url}
                                className="h-24 w-24"
                            />
                        </div>

                        <h2 className="mt-4 text-2xl font-semibold">
                            {profile.display_name}
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground break-all">
                            {user.email}
                        </p>
                    </div>
                    <ProfileDialog
                        profile={profile}
                        trigger={<Button
                            variant="outline"
                            className="w-full rounded-full"
                        >
                            Edit profile
                        </Button>}
                    />
                </section>
            </Page.Header>

            <Page.Content>
                <section className="space-y-3">
                    <h3 className="px-1 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        Profile
                    </h3>

                    <div className="rounded-3xl bg-card shadow-(--shadow-soft) py-2">
                        <div className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium border-b last:border-b-0">
                            <span>
                                Name
                            </span>
                            <span className="truncate text-sm text-muted-foreground">
                                {profile.display_name}
                            </span>
                        </div>
                        <div className="flex w-full items-center justify-between px-5 py-4 text-sm font-medium border-b last:border-b-0">
                            <span>
                                Notifications
                            </span>
                            <span className="truncate text-sm text-muted-foreground">
                                {profile.notifications_enabled ? "Enabled" : "Disabled"}
                            </span>
                        </div>
                    </div>
                </section>

                <Button
                    variant="outline"
                    className="w-full rounded-full"
                    onClick={() => setConfirmOpen(true)}
                >
                    {signingOut ? "Signing out..." : "Sign out"}
                </Button>

                <ConfirmDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    title="Sign out?"
                    description="You will need to log in again."
                    confirmText="Sign out"
                    confirmVariant="destructive"
                    loading={signingOut}
                    onConfirm={signOut}
                />

                <section className="space-y-3">
                    <div className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
                        <h4 className="font-medium text-destructive">
                            Delete account
                        </h4>

                        <p className="mt-2 text-sm text-muted-foreground">
                            Permanently delete your account, pets, reminders, activities,
                            health records, and all associated data.
                        </p>

                        <Button
                            variant="destructive"
                            className="mt-5 w-full rounded-full"
                            onClick={() => setDeleteOpen(true)}
                        >
                            Delete account
                        </Button>
                    </div>
                </section>

                <Dialog
                    open={deleteOpen}
                    onOpenChange={(open) => {
                        setDeleteOpen(open);

                        if (!open) {
                            setDeleteText("");
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete account</DialogTitle>
                        </DialogHeader>

                        <p className="text-sm text-muted-foreground">
                            This action cannot be undone.
                        </p>

                        <p className="text-sm">
                            Type <strong>DELETE</strong> to continue.
                        </p>

                        <Input
                            value={deleteText}
                            onChange={(e) => setDeleteText(e.target.value)}
                        />

                        <Button
                            variant="destructive"
                            disabled={
                                deleteText !== "DELETE" ||
                                deleteAccount.isPending ||
                                signingOut
                            }
                            onClick={() => deleteAccount.mutate()}
                        >
                            {deleteAccount.isPending
                                ? "Deleting..."
                                : "Delete account"}
                        </Button>
                    </DialogContent>
                </Dialog>
            </Page.Content>
        </Page>
    );
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function ProfileDialog({ profile, trigger }: { profile: Profile; trigger: React.ReactNode }) {
    const { refetchProfile, user } = useAuth();
    const [open, setOpen] = useState(false);
    const form = useZodForm(profileFormSchema, profileToForm(profile));
    const inputRef = useRef<HTMLInputElement>(null);

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(profile?.avatar_url ?? null);
    const [photoRemoved, setPhotoRemoved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
        if (file.size > MAX_PHOTO_BYTES) { toast.error("Image must be under 5MB"); return; }
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

    async function uploadNewPhoto(): Promise<string> {
        const ext = photoFile!.name.split(".").pop() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, photoFile!, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
        return urlData.publicUrl;
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

    useEffect(() => {
        form.reset(profileToForm(profile));
    }, [profile]);

    const save = useMutation({
        mutationFn: async () => {
            const data = form.getValidated();

            if (!data) return;

            setUploading(true);
            let avatar_url: string | null | undefined = undefined;
            if (photoFile) avatar_url = await uploadNewPhoto();
            else if (photoRemoved) avatar_url = null;

            const payload = {
                display_name: data.display_name,
                avatar_url: data.avatar_url || null,
                ...(avatar_url !== undefined ? { avatar_url } : {}),
                // timezone: data.timezone,
                // locale: data.locale,
                // notifications_enabled: data.notifications_enabled,
            };

            const { error } = await supabase.from("profiles").update(payload).eq("id", profile?.id);

            if (error) throw error;

            if (avatar_url !== undefined) {
                const oldPath = extractStoragePath(profile.avatar_url, "profile-photos");
                if (oldPath) await supabase.storage.from("profile-photos").remove([oldPath]);
            }
        },
        onSuccess: async () => {
            await refetchProfile();
            toast.success("Profile updated");
            setOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
        onSettled: () => setUploading(false),
    });

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) form.reset(profileToForm(profile)); }}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="rounded-3xl">
                <DialogHeader><DialogTitle className="font-display">{"Edit profile"}</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
                    <div className="flex justify-center">
                        <div className="relative h-20 w-20">
                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                className="h-24 w-24 flex items-center justify-center overflow-hidden group">
                                {photoPreview
                                    ? <UserAvatar
                                        name={profile.display_name}
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
                                disabled
                                aria-checked={form.values.notifications_enabled}
                                onClick={() => form.setField("notifications_enabled", !form.values.notifications_enabled)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${form.values.notifications_enabled ? "bg-primary" : "bg-input"}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${form.values.notifications_enabled ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                            <span className="text-sm text-muted-foreground">{form.values.notifications_enabled ? "Enabled" : "Disabled"}</span>
                        </div>
                    </Field>
                    <Button type="submit" className="w-full rounded-full" disabled={save.isPending || uploading}>
                        {save.isPending || uploading ? "Saving…" : "Save changes"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}