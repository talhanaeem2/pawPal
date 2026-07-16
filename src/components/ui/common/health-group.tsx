type HealthGroupProps = {
    title: string;
    emptyMessage: string;
    hasItems: boolean;
    children: React.ReactNode;
};

export function HealthGroup({ title, emptyMessage, children, hasItems }: HealthGroupProps) {
    return (
        <section>
            <h2 className="font-display text-lg mb-2">{title}</h2>
            {!hasItems ? (
                <div className="rounded-3xl bg-card p-5 text-sm text-muted-foreground shadow-(--shadow-soft)">
                    {emptyMessage}
                </div>
            ) : (
                <ul className="rounded-3xl bg-card divide-y divide-border/60 shadow-(--shadow-soft)">
                    {children}
                </ul>
            )}
        </section>
    );
}