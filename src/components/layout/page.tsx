import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface RootProps {
    children: ReactNode;
}

interface SectionProps {
    children: ReactNode;
    className?: string;
}

function Root({ children }: RootProps) {
    return (
        <div className="flex h-full flex-col">
            {children}
        </div>
    );
}

function Header({ children, className }: SectionProps) {
    return (
        <div
            className={cn(
                "sticky top-0 z-10 backdrop-blur-xl supports-backdrop-filter:bg-background/80 flex flex-col gap-6 pt-4 pb-6",
                className
            )}
        >
            {children}
        </div>
    );
}

function Content({ children, className }: SectionProps) {
    return (
        <div
            className={cn(
                "flex-1 overflow-y-auto scrollbar-hide min-h-0",
                className
            )}
        >
            <div
                style={{
                    paddingBottom:
                        "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))",
                }}
                className="flex flex-col gap-6"
            >
                {children}
            </div>
        </div>
    );
}

export const Page = Object.assign(Root, {
    Header,
    Content,
});