import { PawPrint } from "lucide-react";

function Loader() {
    return (
        <div className="min-h-screen flex items-center justify-center px-5"
            style={{ background: "linear-gradient(160deg, var(--sage-soft) 0%, var(--cream) 45%, var(--peach-soft) 100%)" }}>
            <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-card shadow-[var(--shadow-soft)] flex items-center justify-center animate-pulse">
                    <PawPrint className="h-7 w-7 text-primary" strokeWidth={1.75} />
                </div>
                <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
        </div>
    );
}

export default Loader;