import { Link } from "@tanstack/react-router";
import { LucideIcon } from "lucide-react";

type SectionProps = {
    title: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    href?: string;
    params?: Record<string, string>;
};

export function Section({
    title,
    icon: Icon,
    children,
    href,
    params,
}: SectionProps) {
    const Header = (
        <>
            <div className="flex items-center gap-2">
                {Icon && (
                    <Icon
                        className="h-4 w-4 text-primary"
                        strokeWidth={1.75}
                    />
                )}
                <h2 className="font-display text-lg">
                    {title}
                </h2>
            </div>

            {href && (
                <span className="shrink-0 text-xs text-muted-foreground">
                    See all
                </span>
            )}
        </>
    );

    return (
        <section className="rounded-3xl bg-card p-5 shadow-(--shadow-soft)">
            {href ? (
                <Link
                    to={href}
                    params={params}
                    className="flex items-center justify-between"
                >
                    {Header}
                </Link>
            ) : (
                <div className="flex items-center justify-between">
                    {Header}
                </div>
            )}

            <div className="mt-2">
                {children}
            </div>
        </section>
    );
}