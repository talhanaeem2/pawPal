import { Link } from "@tanstack/react-router";
import { Calendar } from "lucide-react";

export function Section({ title, icon: Icon, href, children }: { title: string; icon: typeof Calendar; href: string; children: React.ReactNode }) {
    return (
        <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
            <Link to={href} className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                    <h2 className="font-display text-lg">{title}</h2>
                </div>
                <Link to={href} className="text-xs text-muted-foreground hover:text-foreground">See all</Link>
            </Link>
            {children}
        </section>
    );
}
