import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/common/dialog";
import { Button } from "@/components/ui/common/button";
import { Field } from "@/components/ui/common/field";
import { Input } from "@/components/ui/common/input";

export function ChangeEmailDialog({ trigger }: { trigger: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");

    const save = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.auth.updateUser(
                { email },
                { emailRedirectTo: `${window.location.origin}/profile` }
            );
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Confirmation email sent — check your inbox to confirm the change");
            setOpen(false);
            setEmail("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-display">Change email</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
                    <Field label="New email address">
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="new@example.com"
                            required
                        />
                    </Field>
                    <p className="text-xs text-muted-foreground">
                        We'll send a confirmation link to your new email address. Your email won't change until you click the link.
                    </p>
                    <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
                        {save.isPending ? "Sending…" : "Send confirmation email"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}