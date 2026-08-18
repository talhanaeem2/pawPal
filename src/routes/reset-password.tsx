import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/common/button";
import { Input } from "@/components/ui/common/input";
import { Label } from "@/components/ui/common/label";
import Loader from "@/components/ui/common/loader";

export const Route = createFileRoute("/reset-password")({
    ssr: false,
    component: ResetPasswordPage,
});

function ResetPasswordPage() {
    const navigate = useNavigate();
    const [ready, setReady] = useState(false);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Supabase processes the reset token from the URL hash on mount
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setReady(true); // token valid, session established
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        if (password !== confirm) { toast.error("Passwords don't match"); return; }
        if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            toast.success("Password changed — you're now signed in");
            navigate({ to: "/home", replace: true });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed");
        } finally {
            setLoading(false);
        }
    }

    if (!ready) return <Loader />;

    return (
        <div className="min-h-screen flex items-center justify-center px-5 py-10"
            style={{ background: "linear-gradient(160deg, var(--sage-soft) 0%, var(--cream) 45%, var(--peach-soft) 100%)" }}>
            <div className="w-full max-w-sm">
                <div className="rounded-3xl bg-card p-6 shadow-(--shadow-soft) space-y-4">
                    <h1 className="font-display text-2xl">Set new password</h1>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="password">New password</Label>
                            <Input id="password" type="password" value={password}
                                onChange={(e) => setPassword(e.target.value)} minLength={6} required placeholder="••••••••" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="confirm">Confirm password</Label>
                            <Input id="confirm" type="password" value={confirm}
                                onChange={(e) => setConfirm(e.target.value)} required placeholder="••••••••" />
                        </div>
                        <Button type="submit" disabled={loading} className="w-full rounded-full h-11">
                            {loading ? "Saving…" : "Set password"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}