import { AlertCircle, RotateCcw } from "lucide-react";

function ErrorState({ onRetry }: { onRetry?: () => void }) {
    return (
        <div className="min-h-screen flex items-center justify-center px-5"
            style={{ background: "linear-gradient(160deg, var(--sage-soft) 0%, var(--cream) 45%, var(--peach-soft) 100%)" }}>
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                <div className="h-14 w-14 rounded-2xl bg-card shadow-(--shadow-soft) flex items-center justify-center">
                    <AlertCircle className="h-7 w-7 text-destructive" strokeWidth={1.75} />
                </div>
                <div>
                    <p className="font-display text-lg">Something went sideways</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        We couldn't load this page. Please try again.
                    </p>
                </div>
                {onRetry && (
                    <button onClick={onRetry}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
                        <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                        Try again
                    </button>
                )}
            </div>
        </div>
    );
}

export default ErrorState;
