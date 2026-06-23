import { useEffect, useState } from "react";
import { Bell, X, Share } from "lucide-react";
import { toast } from "sonner";
import {
    pushSupported,
    getPushPermissionState,
    isSubscribed,
    subscribeToPush,
} from "@/lib/push-notifications";
import { isIos, isStandalone } from "@/components/ui/install-prompt";

const DISMISS_KEY = "pawpal_push_dismissed_at";
const DISMISS_DAYS = 7;

const IOS_NUDGE_DISMISS_KEY = "pawpal_ios_push_nudge_dismissed_at";
const IOS_NUDGE_DISMISS_DAYS = 3;

function recentlyDismissed(key: string, days: number) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        const dismissedAt = Number(raw);
        if (Number.isNaN(dismissedAt)) return false;
        return (Date.now() - dismissedAt) / 86_400_000 < days;
    } catch { return false; }
}

export default function PushPrompt() {
    const [mode, setMode] = useState<"push" | "ios-nudge" | "hidden">("hidden");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            // iOS not installed as PWA — push isn't available yet; nudge to install
            if (isIos() && !isStandalone()) {
                if (!recentlyDismissed(IOS_NUDGE_DISMISS_KEY, IOS_NUDGE_DISMISS_DAYS)) {
                    setMode("ios-nudge");
                }
                return;
            }

            // Push not supported on this browser/OS at all
            if (!pushSupported()) return;

            if (recentlyDismissed(DISMISS_KEY, DISMISS_DAYS)) return;

            const permission = await getPushPermissionState();
            if (permission === "denied" || permission === "unsupported") return;

            const subscribed = await isSubscribed();
            if (subscribed) return;

            setMode("push");
        })();
    }, []);

    function dismiss() {
        try {
            if (mode === "ios-nudge") {
                localStorage.setItem(IOS_NUDGE_DISMISS_KEY, String(Date.now()));
            } else {
                localStorage.setItem(DISMISS_KEY, String(Date.now()));
            }
        } catch { /* noop */ }
        setMode("hidden");
    }

    async function enable() {
        setLoading(true);
        const result = await subscribeToPush();
        setLoading(false);
        if (result.ok) {
            toast.success("Reminders enabled");
            setMode("hidden");
        } else {
            toast.error(result.error || "Couldn't enable reminders");
        }
    }

    if (mode === "hidden") return null;

    // iOS not-yet-installed nudge — tell user they need to install first
    if (mode === "ios-nudge") {
        return (
            <div className="rounded-2xl bg-card shadow-(--shadow-soft) border border-border/60 p-4 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-primary" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Enable reminders</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Tap <Share className="inline h-3 w-3 mx-0.5 -mt-0.5" strokeWidth={2} />{" "}
                        <span className="font-medium text-foreground">"Add to Home Screen"</span> first,
                        then open the app to turn on notifications
                    </p>
                </div>
                <button onClick={dismiss} aria-label="Dismiss"
                    className="shrink-0 text-muted-foreground hover:text-foreground p-1">
                    <X className="h-4 w-4" />
                </button>
            </div>
        );
    }

    // Normal push permission prompt (Android / installed iOS PWA)
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
            <button onClick={dismiss} aria-label="Dismiss"
                className="shrink-0 text-muted-foreground hover:text-foreground p-1">
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}