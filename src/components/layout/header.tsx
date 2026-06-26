import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { PawPrint, LogOut, User, Bell, Settings } from "lucide-react";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { UserAvatar } from "../ui/user-avatar";
import { useAuth } from "@/contexts/auth-context";

function Header({ onSignOut, loading }: { onSignOut: () => void; loading: boolean }) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const { user } = useAuth();

    const avatarUrl = user?.user_metadata?.avatar_url;
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name;

    return (
        <header className="sticky top-0 z-20 backdrop-blur bg-background/80 border-b border-border/60">
            <div className="mx-auto max-w-2xl flex items-center justify-between px-5 h-14">
                <Link to="/home" className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/30 flex items-center justify-center">
                        <PawPrint className="h-4 w-4 text-primary-foreground" strokeWidth={2} />
                    </div>
                    <span className="font-display text-lg">Pawpal</span>
                </Link>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <UserAvatar
                                name={name}
                                avatarUrl={avatarUrl}
                            />
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link to="/">
                                <User className="mr-2 h-4 w-4" />
                                Profile
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                            <Link to="/">
                                <Bell className="mr-2 h-4 w-4" />
                                Notifications
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                            <Link to="/">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setConfirmOpen(true)}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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