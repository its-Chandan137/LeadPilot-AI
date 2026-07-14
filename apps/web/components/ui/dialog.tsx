"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DialogContext = createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => {},
});

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = useContext(DialogContext);
  return (
    <button
      type="button"
      className={className}
      onClick={() => onOpenChange(true)}
      {...props}
    >
      {children}
    </button>
  );
}

export function DialogContent({
  children,
  className,
  hideClose = false,
}: {
  children: ReactNode;
  className?: string;
  hideClose?: boolean;
}) {
  const { open, onOpenChange } = useContext(DialogContext);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (!open) return;
    previousActiveElement.current = document.activeElement;

    const firstInput = panelRef.current?.querySelector("input");
    firstInput?.focus();

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      (previousActiveElement.current as HTMLElement)?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={panelRef}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl",
          className
        )}
      >
        {!hideClose && (
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm text-slate-400 hover:text-slate-600"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DialogTitle({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <h3 className={cn("text-lg font-semibold text-slate-900", className)}>
      {children}
    </h3>
  );
}

export function DialogDescription({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <p className={cn("text-sm text-slate-500", className)}>{children}</p>;
}

export function DialogBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-hidden bg-white", className)}>
      {children}
    </div>
  );
}

export function DialogFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DialogCloseButton({
  className,
  "aria-label": ariaLabel = "Close",
}: {
  className?: string;
  "aria-label"?: string;
}) {
  const { onOpenChange } = useContext(DialogContext);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "shrink-0 rounded-md p-1 text-black hover:bg-slate-100",
        className
      )}
      onClick={() => onOpenChange(false)}
    >
      <X className="h-5 w-5" strokeWidth={2.25} />
    </button>
  );
}

const sizeClasses = {
  md: "max-w-lg p-6",
  lg: "max-w-2xl p-6",
  xl: "max-w-4xl p-6",
  full: "flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden rounded-2xl p-0 shadow-2xl",
} as const;

export type CommonDialogSize = keyof typeof sizeClasses;

/**
 * Shared dialog shell with optional title, description, body, and footer.
 * Use `size="full"` for large previews (header / body / footer layout).
 */
export function CommonDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
  contentClassName,
  bodyClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: CommonDialogSize;
  className?: string;
  contentClassName?: string;
  bodyClassName?: string;
}) {
  const isStructured = size === "full" || title != null || footer != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose={isStructured}
        className={cn(sizeClasses[size], contentClassName, className)}
      >
        {isStructured ? (
          <>
            {(title != null || description != null) && (
              <DialogHeader>
                <div className="min-w-0">
                  {title != null && <DialogTitle>{title}</DialogTitle>}
                  {description != null && (
                    <DialogDescription>{description}</DialogDescription>
                  )}
                </div>
                <DialogCloseButton />
              </DialogHeader>
            )}
            <DialogBody className={bodyClassName}>{children}</DialogBody>
            {footer != null && <DialogFooter>{footer}</DialogFooter>}
          </>
        ) : (
          children
        )}
      </DialogContent>
    </Dialog>
  );
}
