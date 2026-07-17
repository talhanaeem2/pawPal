import { Section } from "@/components/layout/section";

type HealthGroupProps = {
    title: string;
    emptyMessage: string;
    hasItems: boolean;
    children: React.ReactNode;
};

export function HealthGroup({ title, emptyMessage, children, hasItems }: HealthGroupProps) {
    return (
        <Section title={title}>
            {!hasItems ? (
                <div className="text-sm text-muted-foreground">
                    {emptyMessage}
                </div>
            ) : (
                <ul className="divide-y divide-border/60 -mx-4">
                    {children}
                </ul>
            )}
        </Section>
    );
}