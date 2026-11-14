import { Slot } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-ink text-paper hover:bg-ink-soft",
  accent: "bg-clay text-white hover:bg-clay-deep",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink",
  ghost: "text-ink hover:bg-paper-deep",
  danger: "bg-surface text-clay border border-clay/40 hover:bg-clay-soft",
} as const;

const sizes = {
  // every size keeps a 44px touch target on phones
  sm: "min-h-11 md:min-h-9 px-3.5 text-sm",
  md: "min-h-11 px-5 text-[15px]",
  lg: "min-h-12 px-7 text-base",
  icon: "size-11",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  asChild?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, asChild, disabled, children, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : (type ?? "button")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-control font-medium",
        "transition-[background-color,color,border-color,transform,opacity] duration-200 ease-out-expo",
        "select-none whitespace-nowrap active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner />}
          {children}
        </>
      )}
    </Comp>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
