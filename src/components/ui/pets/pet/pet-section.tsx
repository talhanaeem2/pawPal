import { Link } from "@tanstack/react-router";
import { LucideIcon } from "lucide-react";

type PetSectionProps = {
    title: string;
    icon: LucideIcon;
    children: React.ReactNode;
    href?: string;
    params?: Record<string, string>;
};

export function PetSection({
    title,
    children,
    icon: Icon,
    href,
    params
}: PetSectionProps) {
    return (
        <section className="rounded-3xl bg-card p-6 shadow-(--shadow-soft)">
            {href ? (
                <Link
                    to={href}
                    params={params}
                    className="flex items-center justify-between"
                >
                    <div className="flex items-center gap-2">
                        <Icon
                            className="h-4 w-4 text-primary"
                            strokeWidth={1.75}
                        />
                        <h2 className="font-display text-lg">
                            {title}
                        </h2>
                    </div>
                    <span className="text-xs text-muted-foreground">See all</span>
                </Link>
            ) : (
                <div className="flex items-center gap-2">
                    <Icon
                        className="h-4 w-4 text-primary"
                        strokeWidth={1.75}
                    />
                    <h2 className="font-display text-lg">
                        {title}
                    </h2>
                </div>
            )}

            <div className="mt-4">
                {children}
            </div>
        </section>
    );
}