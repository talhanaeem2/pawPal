import { Link } from "@tanstack/react-router";

export function Empty({ text, cta, href, search }: { text: string; cta: string; href: string; search?: Record<string, unknown> }) {
    return (
        <div className="py-2 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{text}</p>
            <Link to={href} search={search} className="text-xs font-medium text-primary hover:underline">{cta} →</Link>
        </div>
    );
}