import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pawpal_install_dismissed_at";
const DISMISS_DAYS = 14;

function isIos() {
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function isStandalone() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
}

function recentlyDismissed() {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (Number.isNaN(dismissedAt)) return false;
    const daysSince = (Date.now() - dismissedAt) / 86_400_000;
    return daysSince < DISMISS_DAYS;
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showIosHint, setShowIosHint] = useState(false);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isStandalone() || recentlyDismissed()) return;

        if (isIos()) {
            setShowIosHint(true);
            setVisible(true);
            return;
        }

        const onBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setVisible(true);
        };

        const onAppInstalled = () => {
            setVisible(false);
            setDeferredPrompt(null);
        };

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.addEventListener("appinstalled", onAppInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.removeEventListener("appinstalled", onAppInstalled);
        };
    }, []);

    function dismiss() {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        setVisible(false);
    }

    async function install() {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") setVisible(false);
        setDeferredPrompt(null);
    }

    if (!visible) return null;

    return (
        <div className="fixed inset-x-0 bottom-20 z-30 px-4 pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto max-w-2xl rounded-2xl bg-card shadow-(--shadow-soft) border border-border/60 p-4 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center">
                    {showIosHint ? (
                        <Share className="h-5 w-5 text-primary" strokeWidth={1.75} />
                    ) : (
                        <Download className="h-5 w-5 text-primary" strokeWidth={1.75} />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Install Pawpal</p>
                    {showIosHint ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Tap <Share className="inline h-3 w-3 -mt-0.5" strokeWidth={2} /> then "Add to Home Screen"
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Add it to your home screen for quick access
                        </p>
                    )}
                </div>

                {!showIosHint && (
                    <button onClick={install}
                        className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition">
                        Install
                    </button>
                )}

                <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-muted-foreground hover:text-foreground p-1">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}