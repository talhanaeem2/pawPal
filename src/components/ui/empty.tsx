import { Link } from "@tanstack/react-router";

export function Empty({ text, cta, href }: { text: string; cta: string; href: string }) {
    return (
        <div className="py-2 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{text}</p>
            <Link to={href} className="text-xs font-medium text-primary hover:underline">{cta} →</Link>
        </div>
    );
}