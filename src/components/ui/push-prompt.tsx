import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import {
    pushSupported,
    getPushPermissionState,
    isSubscribed,
    subscribeToPush,
} from "@/lib/push-notifications";

const DISMISS_KEY = "pawpal_push_dismissed_at";
const DISMISS_DAYS = 7;

function recentlyDismissed() {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (Number.isNaN(dismissedAt)) return false;
    return (Date.now() - dismissedAt) / 86_400_000 < DISMISS_DAYS;
}

export default function PushPrompt() {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            if (!pushSupported() || recentlyDismissed()) return;
            const permission = await getPushPermissionState();
            if (permission === "denied" || permission === "unsupported") return;
            const subscribed = await isSubscribed();
            if (subscribed) return;
            setVisible(true);
        })();
    }, []);

    function dismiss() {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setVisible(false);
    }

    async function enable() {
        setLoading(true);
        const result = await subscribeToPush();
        setLoading(false);
        if (result.ok) {
            toast.success("Reminders enabled");
            setVisible(false);
        } else {
            toast.error(result.error || "Couldn't enable reminders");
        }
    }

    if (!visible) return null;

    return (
        <div className="rounded-2xl bg-card shadow-(--shadow-soft) border border-border/60 p-4 flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" strokeWidth={1.75} />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Turn on reminders</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Get notified for feedings, meds, and vet visits
                </p>
            </div>

            <button onClick={enable} disabled={loading}
                className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition disabled:opacity-60">
                {loading ? "…" : "Enable"}
            </button>

            <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-muted-foreground hover:text-foreground p-1">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}