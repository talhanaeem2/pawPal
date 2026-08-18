import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/common/dialog";
import { Button } from "@/components/ui/common/button";
import { Field } from "@/components/ui/common/field";
import { Input } from "@/components/ui/common/input";

export function ChangePasswordDialog({ trigger }: { trigger: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const { user } = useAuth();

    const save = useMutation({
        mutationFn: async () => {
            if (newPassword !== confirmPassword) {
                throw new Error("Passwords don't match");
            }
            if (newPassword.length < 6) {
                throw new Error("Password must be at least 6 characters");
            }

            // Re-authenticate first to verify current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email!,
                password: currentPassword,
            });
            if (signInError) throw new Error("Current password is incorrect");

            // Then update to new password
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Password changed successfully");
            setOpen(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-display">Change password</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
                    <Field label="Current password">
                        <Input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </Field>
                    <Field label="New password">
                        <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                            required
                        />
                    </Field>
                    <Field label="Confirm new password">
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </Field>
                    <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                        {save.isPending ? "Changing…" : "Change password"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}