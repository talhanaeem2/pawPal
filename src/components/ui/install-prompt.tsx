import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pawpal_install_dismissed_at";
const DISMISS_DAYS = 14;

export function isIos() {
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

export function isStandalone() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

function recentlyDismissed() {
    try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (!raw) return false;
        const dismissedAt = Number(raw);
        if (Number.isNaN(dismissedAt)) return false;
        return (Date.now() - dismissedAt) / 86_400_000 < DISMISS_DAYS;
    } catch { return false; }
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [show, setShow] = useState(false);
    const ios = typeof window !== "undefined" && isIos();

    useEffect(() => {
        if (isStandalone() || recentlyDismissed()) return;

        if (ios) {
            setShow(true);
            return;
        }

        const onBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShow(true);
        };
        const onAppInstalled = () => { setShow(false); setDeferredPrompt(null); };

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.addEventListener("appinstalled", onAppInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.removeEventListener("appinstalled", onAppInstalled);
        };
    }, [ios]);

    function dismiss() {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
        setShow(false);
    }

    async function install() {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") setShow(false);
        setDeferredPrompt(null);
    }

    if (!show) return null;

    return (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto max-w-2xl rounded-2xl bg-card shadow-(--shadow-soft) border border-border/60 p-4 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center">
                    {ios
                        ? <Share className="h-5 w-5 text-primary" strokeWidth={1.75} />
                        : <Download className="h-5 w-5 text-primary" strokeWidth={1.75} />
                    }
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Install Pawpal</p>
                    {ios ? (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            Tap <Share className="inline h-3 w-3 mx-0.5 -mt-0.5" strokeWidth={2} /> then{" "}
                            <span className="font-medium text-foreground">"Add to Home Screen"</span> to get notifications
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Add to your home screen for quick access
                        </p>
                    )}
                </div>

                {!ios && deferredPrompt && (
                    <button onClick={install}
                        className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition">
                        Install
                    </button>
                )}

                <button onClick={dismiss} aria-label="Dismiss"
                    className="shrink-0 text-muted-foreground hover:text-foreground p-1">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}