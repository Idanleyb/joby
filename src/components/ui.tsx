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

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" };

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        variant === "primary" && "bg-brand text-brand-contrast hover:opacity-90",
        variant === "secondary" && "border border-border bg-surface hover:bg-background",
        variant === "ghost" && "text-muted underline-offset-4 hover:underline",
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
      {error ? <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}

export function Input(props: ComponentPropsWithRef<"input">) {
  return (
    <input
      {...props}
      className={cx(
        "min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-base",
        "placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30",
        props.className,
      )}
    />
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
      {message}
    </p>
  );
}
