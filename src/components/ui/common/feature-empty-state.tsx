import { Link, type LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

type FeatureEmptyStateProps = {
    icon: LucideIcon;
    title: string;
    description: string;
    cta?: string;
    children?: React.ReactNode;
} & Pick<LinkProps, "to" | "search">;

export function FeatureEmptyState({
    icon: Icon,
    title,
    description,
    cta,
    to,
    search,
    children,
}: FeatureEmptyStateProps) {
    return (
        <div className="flex flex-col items-center rounded-3xl bg-card p-8 text-center shadow-(--shadow-soft) px-6 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                <Icon
                    className="h-7 w-7 text-primary"
                    strokeWidth={1.75}
                />
            </div>

            <h3 className="mt-5 font-display text-lg">
                {title}
            </h3>

            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                {description}
            </p>

            {children ?? (
                <ButtonAsLink
                    to={to}
                    search={search}
                    className="mt-6"
                >
                    {cta}
                </ButtonAsLink>
            )}
        </div>
    );
}

function ButtonAsLink({
    children,
    ...props
}: React.PropsWithChildren<Pick<LinkProps, "to" | "search"> & { className?: string }>) {
    return (
        <Link
            {...props}
            className={`inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 ${props.className ?? ""}`}
        >
            {children}
        </Link>
    );
}