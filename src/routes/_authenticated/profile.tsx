import { useMutation } from "@tanstack/react-query";
import { createFileRoute, ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, useRef, useState, type UIEvent } from "react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/integrations/supabase/client";

import InlineErrorState from "@/components/ui/common/inline-error-state";
import InlineLoader from "@/components/ui/common/inline-loader";
import NotFoundState from "@/components/ui/common/not-found-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/common/dialog";
import { Page } from "@/components/layout/page";
import { ConfirmDialog } from "@/components/ui/common/confirm-dialog";
import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { UserAvatar } from "@/components/ui/common/user-avatar";
import { ProfileFormDialog } from "@/components/ui/profile/profile-form-dialog";

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
    const [createOpen, setCreateOpen] = useState(false);
    const profileCardRef = useRef<HTMLDivElement>(null);
    const avatarRef = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLHeadingElement>(null);
    const emailRef = useRef<HTMLParagraphElement>(null);

    const progressRef = useRef(0);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, []);

    function handleContentScroll(event: UIEvent<HTMLDivElement>) {
        progressRef.current = Math.min(
            event.currentTarget.scrollTop / 140,
            1
        );

        if (frameRef.current !== null) return;

        frameRef.current = requestAnimationFrame(() => {
            const progress = progressRef.current;

            const card = profileCardRef.current;
            const avatar = avatarRef.current;
            const name = nameRef.current;
            const email = emailRef.current;

            if (card) {
                card.style.paddingTop = `${32 - 16 * progress}px`;
                card.style.paddingBottom = `${32 - 16 * progress}px`;
                card.style.gap = `${16 - 8 * progress}px`;
            }

            if (avatar) {
                const size = 96 - 44 * progress;

                avatar.style.width = `${size}px`;
                avatar.style.height = `${size}px`;
            }

            if (name) {
                const fontSize = 24 - 4 * progress;

                name.style.fontSize = `${fontSize}px`;
            }

            if (email) {
                email.style.maxHeight = `${20 * (1 - progress)}px`;
                email.style.opacity = `${1 - progress}`;
                email.style.transform = `translateY(${-6 * progress}px)`;
                email.style.pointerEvents = progress > 0.98 ? "none" : "auto";
            }

            frameRef.current = null;
        });
    }

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

                <section
                    ref={profileCardRef}
                    className="rounded-3xl bg-card p-8 shadow-(--shadow-soft) flex flex-col gap-4"
                >
                    <div className="flex flex-col items-center text-center gap-4">
                        <div
                            className="relative"
                            ref={avatarRef}
                            style={{ width: 96, height: 96 }}
                        >
                            <UserAvatar
                                name={profile.display_name}
                                avatarUrl={profile.avatar_url}
                                className="h-full w-full"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <h2
                                ref={nameRef}
                                className="text-2xl font-semibold"
                            >
                                {profile.display_name}
                            </h2>

                            <p
                                ref={emailRef}
                                className="text-sm text-muted-foreground break-all"
                            >
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <ProfileFormDialog
                        profile={profile}
                        trigger={<Button
                            variant="outline"
                            className="w-full rounded-full"
                        >
                            Edit profile
                        </Button>}
                        open={createOpen}
                        onOpenChange={(o) => {
                            setCreateOpen(o);
                        }}
                    />
                </section>
            </Page.Header>

            <Page.Content extraScrollRoom={140} onScroll={handleContentScroll}>
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