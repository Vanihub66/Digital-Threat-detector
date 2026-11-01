"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

/**
 * Accessible modal built on the native <dialog> element, which provides focus
 * trapping, Escape-to-close and an inert background.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(92vw,460px)] rounded-2xl border border-border-strong bg-elevated p-0 text-fg shadow-2xl backdrop:bg-transparent open:animate-fade-up"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          {icon && <span className="mt-0.5 shrink-0 [&_svg]:size-5">{icon}</span>}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold">
              {title}
            </h2>
            {description && (
              <div id={descId} className="mt-1.5 text-sm text-muted">
                {description}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close dialog">
            <X />
          </Button>
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
      {footer && <div className="flex justify-end gap-2 border-t border-border bg-surface-2/50 px-6 py-4">{footer}</div>}
    </dialog>
  );
}
