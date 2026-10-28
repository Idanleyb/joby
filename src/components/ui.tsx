import type { ButtonHTMLAttributes, ComponentPropsWithRef, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-border bg-surface p-5 sm:p-6", className)}>{children}</div>;
}

export function PageShell({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-muted">{subtitle}</p> : null}
      </header>
      {children}
    </main>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "action" | "ghost" };

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        variant === "primary" && "bg-brand text-brand-contrast hover:bg-brand-hover",
        variant === "secondary" && "border-[1.5px] border-foreground bg-surface hover:bg-background",
        variant === "action" && "border border-action-border bg-action text-foreground hover:brightness-[0.97]",
        variant === "ghost" && "text-foreground underline-offset-4 hover:underline",
        className,
      )}
    />
  );
}

export function Field({ label, hint, error, children, htmlFor }: {
  label: string; hint?: string; error?: string | null; children: ReactNode; htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">{label}</label>
      {children}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
    </div>
  );
}

export function Input(props: ComponentPropsWithRef<"input">) {
  return (
    <input
      {...props}
      className={cx(
        "min-h-12 w-full rounded-xl border border-input-border bg-surface px-4 text-base",
        "placeholder:text-muted/70 focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground",
        props.className,
      )}
    />
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
      {message}
    </p>
  );
}

/** A note box. "info" (Blue 50) = something to know; "action" (Amber 50) = something to do. */
export function Banner({ tone = "info", children, className }: { tone?: "info" | "action"; children: ReactNode; className?: string }) {
  return (
    <div role="status" className={cx(
      "rounded-xl px-4 py-3 text-sm",
      tone === "info" ? "bg-info" : "border border-action-border bg-action",
      className,
    )}>
      {children}
    </div>
  );
}
