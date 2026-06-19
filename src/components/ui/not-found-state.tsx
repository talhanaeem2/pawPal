import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";

function NotFoundState() {
    return (
        <div className="min-h-screen flex items-center justify-center px-5"
            style={{ background: "linear-gradient(160deg, var(--sage-soft) 0%, var(--cream) 45%, var(--peach-soft) 100%)" }}>
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                <div className="h-14 w-14 rounded-2xl bg-card shadow-[var(--shadow-soft)] flex items-center justify-center">
                    <Search className="h-7 w-7 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div>
                    <p className="font-display text-lg">Nothing here</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        This page doesn't exist or may have moved.
                    </p>
                </div>
                <Link to="/home"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
                    Go home
                </Link>
            </div>
        </div>
    );
}

export default NotFoundState;
