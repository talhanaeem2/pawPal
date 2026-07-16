import { Label } from "./label";

export function Field({ label, children, className = "", error = "", description = "" }:
    { label: string; children: React.ReactNode; className?: string, error?: string; description?: string }) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            {children}
            {description && (
                <p className="text-xs text-primary-foreground">{description}</p>
            )}
            {error && (
                <p className="text-xs text-destructive pl-2">
                    {error}
                </p>
            )}
        </div>
    );
}