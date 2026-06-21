import { Link } from "@tanstack/react-router";
import { PawPrint, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";

function Header({ onSignOut, loading }: { onSignOut: () => void; loading: boolean }) {
    const [confirmOpen, setConfirmOpen] = useState(false);

    return (
        <header className="sticky top-0 z-20 backdrop-blur bg-background/80 border-b border-border/60">
            <div className="mx-auto max-w-2xl flex items-center justify-between px-5 h-14">
                <Link to="/home" className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/30 flex items-center justify-center">
                        <PawPrint className="h-4 w-4 text-primary-foreground" strokeWidth={2} />
                    </div>
                    <span className="font-display text-lg">Pawpal</span>
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmOpen(true)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Sign out"
                >
                    <LogOut className="h-4 w-4" />
                </Button>
                <ConfirmDialog
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    title="Sign out?"
                    description="You will need to log in again."
                    confirmText="Sign out"
                    confirmVariant="destructive"
                    loading={loading}
                    onConfirm={onSignOut}
                />
            </div>
        </header>
    );
}

export default Header;