import { PawPrint } from "lucide-react";

function InlineLoader() {
    return (
        <div className="flex flex-col items-center justify-center gap-3 min-h-[calc(100dvh-168px-env(safe-area-inset-bottom))]">
            <div className="h-14 w-14 rounded-2xl bg-card shadow-(--shadow-soft) flex items-center justify-center animate-pulse">
                <PawPrint className="h-7 w-7 text-primary" strokeWidth={1.75} />
            </div>
            <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
    );
}

export default InlineLoader;