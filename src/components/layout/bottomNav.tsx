import { Link } from "@tanstack/react-router";
import { Home, PawPrint, Calendar, Activity, HeartPulse } from "lucide-react";

export const navItems = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/pets", label: "Pets", icon: PawPrint },
    { to: "/schedule", label: "Schedule", icon: Calendar },
    { to: "/health", label: "Health", icon: HeartPulse },
    { to: "/activity", label: "Activity", icon: Activity },
] as const;

function BottomNav({ pathname }: { pathname: string }) {
    return (
        <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-border/60 bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto max-w-2xl grid grid-cols-5">
                {navItems.map(({ to, label, icon: Icon }) => {
                    const active = pathname === to || (to !== "/home" && pathname.startsWith(to));
                    return (
                        <Link key={to} to={to}
                            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                }`}>
                            <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} strokeWidth={1.75} />
                            {label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default BottomNav;