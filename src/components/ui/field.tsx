import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border bg-bg-2 px-3.5 text-sm text-fg placeholder:text-subtle transition-colors outline-none " +
  "focus:border-accent/60 focus:ring-4 focus:ring-accent/10 disabled:opacity-50";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-fg", className)} {...props} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, "h-11", invalid ? "border-critical/60" : "border-border-strong", className)}
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(control, "min-h-32 resize-y py-3 leading-relaxed", invalid ? "border-critical/60" : "border-border-strong", className)}
        {...props}
      />
    );
  },
);

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-critical">
      <CircleAlert className="size-3.5" aria-hidden />
      {children}
    </p>
  );
}

export function FieldHint({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <p id={id} className={cn("mt-1.5 text-xs text-subtle", className)}>
      {children}
    </p>
  );
}
