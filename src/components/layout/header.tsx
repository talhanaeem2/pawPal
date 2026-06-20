import { Link } from "@tanstack/react-router";
import { PawPrint, LogOut } from "lucide-react";

function Header({ onSignOut }: { onSignOut: () => void }) {
    return (
        <header className="sticky top-0 z-20 backdrop-blur bg-background/80 border-b border-border/60">
            <div className="mx-auto max-w-2xl flex items-center justify-between px-5 h-14">
                <Link to="/home" className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/30 flex items-center justify-center">
                        <PawPrint className="h-4 w-4 text-primary-foreground" strokeWidth={2} />
                    </div>
                    <span className="font-display text-lg">Pawpal</span>
                </Link>
                <button onClick={onSignOut}
                    className="text-muted-foreground hover:text-foreground p-2 rounded-full"
                    aria-label="Sign out">
                    <LogOut className="h-4 w-4" />
                </button>
            </div>
        </header>
    );
}

export default Header;