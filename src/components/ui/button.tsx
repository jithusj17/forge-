import { Slot } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "secondary" | "pill" | "ghost";
type Size = "xs" | "sm" | "md" | "icon-sm" | "icon-xs";

const variants: Record<Variant, string> = {
  default:
    "border border-gray-1000 bg-gray-1000 text-bg-100 hover:border-gray-900 hover:bg-gray-900 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-700",
  secondary: "border border-alpha-400 bg-bg-300 text-gray-1000 hover:bg-gray-100",
  pill: "rounded-full border border-alpha-400 bg-bg-300 text-gray-900 hover:bg-gray-100 hover:text-gray-1000",
  ghost: "border border-transparent bg-transparent text-gray-1000 hover:bg-alpha-400",
};

const sizes: Record<Size, string> = {
  xs: "h-6 rounded-md px-2 text-xs",
  sm: "h-8 rounded-md px-3 text-sm has-[>svg]:px-2.5",
  md: "h-10 rounded-lg px-4 text-sm",
  "icon-sm": "size-7 rounded-md p-0",
  "icon-xs": "size-5 rounded-full p-0.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "sm", asChild, type = "button", ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(
        "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap font-medium outline-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-100",
        "disabled:cursor-not-allowed [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
