import { Label } from "./label";

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <Label className="text-xs text-muted-foreground">{label}</Label>
            {children}
        </div>
    );
}