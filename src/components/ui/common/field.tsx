import { Label } from "./label";

export function Field({ label, children, className = "", error = "", description = "" }:
    { label: string; children: React.ReactNode; className?: string, error?: string; description?: string }) {
    return (
        <div className={className}>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <div className="mt-1">
                {children}
            </div>
            {description && (
                <p className="text-xs text-primary-foreground mt-1">{description}</p>
            )}
            {error && (
                <p className="text-xs text-destructive pl-2">
                    {error}
                </p>
            )}
        </div>
    );
}