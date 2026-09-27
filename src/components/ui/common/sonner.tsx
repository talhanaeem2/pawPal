import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/contexts/theme-context";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme}
      position="top-center"
      closeButton
      richColors={false}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:rounded-2xl group-[.toaster]:shadow-(--shadow-soft) group-[.toaster]:font-sans",
          title: "group-[.toast]:font-medium group-[.toast]:text-sm",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-xs",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-full",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-full",
          closeButton:
            "group-[.toast]:bg-card group-[.toast]:border-border group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground",
          success:
            "group-[.toaster]:!bg-[var(--toast-success-bg)] group-[.toaster]:!text-foreground group-[.toaster]:!border-[var(--toast-success-border)]",
          error:
            "group-[.toaster]:!bg-[var(--toast-error-bg)] group-[.toaster]:!text-foreground group-[.toaster]:!border-[var(--toast-error-border)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };