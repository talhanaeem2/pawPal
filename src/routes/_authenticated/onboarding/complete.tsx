import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Heart } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";

import { Button } from "@/components/ui/common/button";
import { profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/onboarding/complete")({
    component: CompletePage,
});

function CompletePage() {
    const qc = useQueryClient();
    const navigate = Route.useNavigate();
    const { user, refetchProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    const onComplete = async () => {
        if (!user) return;

        try {
            setLoading(true);

            const { error } = await supabase.from("profiles").update({ has_completed_onboarding: true }).eq("id", user.id);

            if (error) throw error;

            qc.setQueryData(profileQuery(user.id).queryKey, (old) => {
                if (!old) return old;

                return {
                    ...old,
                    has_completed_onboarding: true,
                };
            });

            navigate({ to: "/home", replace: true });
            await refetchProfile();

        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-full flex-col justify-center space-y-8 text-center">
            <div>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15">
                    <CheckCircle2 className="h-10 w-10 text-primary" />
                </div>

                <h1 className="mt-6 font-display text-3xl">
                    You're all set!
                </h1>

                <p className="mt-2 text-muted-foreground">
                    Your pet has been added and your first reminder is ready.
                </p>
            </div>

            <div className="rounded-3xl border bg-card p-6 text-left shadow-(--shadow-soft)">
                <div className="flex items-start gap-3">
                    <Heart className="mt-1 h-5 w-5 text-primary" />

                    <div>
                        <p className="font-medium">
                            Welcome to Pawpal
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Track your pets, manage reminders, record vaccinations,
                            monitor health, and keep everything organized in one place.
                        </p>
                    </div>
                </div>
            </div>

            <Button
                className="h-11 w-full rounded-full"
                onClick={onComplete}
                disabled={loading}
            >
                {loading ? "Starting Pawpal…" : "Start using Pawpal"}
            </Button>
        </div>
    );
}