import { forwardRef, ReactNode, type UIEventHandler } from "react";

import { cn } from "@/lib/utils";

interface RootProps {
  children: ReactNode;
}

interface SectionProps {
  children: ReactNode;
  className?: string;
}

interface ContentProps extends SectionProps {
  onScroll?: UIEventHandler<HTMLDivElement>;
}

function Root({ children }: RootProps) {
  return <div className="flex h-full flex-col">{children}</div>;
}

const Header = forwardRef<HTMLDivElement, SectionProps>(function Header(
  { children, className },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "sticky top-0 z-10 backdrop-blur-xl supports-backdrop-filter:bg-background/80 flex flex-col gap-4 pt-4 pb-6",
        className,
      )}
    >
      {children}
    </div>
  );
});

Header.displayName = "PageHeader";

function Content({ children, className, onScroll }: ContentProps) {
  return (
    <div
      onScroll={onScroll}
      className={cn("flex-1 overflow-y-auto scrollbar-hide min-h-0", className)}
    >
      <div
        style={{
          paddingBottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))",
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
