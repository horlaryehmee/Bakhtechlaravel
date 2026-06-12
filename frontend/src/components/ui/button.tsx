import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        destructive:
          "bg-red-600 text-white hover:bg-red-700",
        outline:
          "border border-gray-200 bg-white hover:bg-gray-50 hover:text-gray-900",
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: "hover:bg-gray-100 hover:text-gray-900",
        link: "text-blue-600 underline-offset-4 hover:underline",
        primary: "bg-[#1261ff] text-white shadow-[0_18px_40px_rgba(18,97,255,0.32)] hover:bg-[#0b4ed6]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  showArrow?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, showArrow = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
        {showArrow && <ArrowRight className="ml-2 h-4 w-4" />}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button };

export function ButtonLink({
  className,
  children,
  variant = "primary",
  showArrow = true,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: string; showArrow?: boolean }) {
  return (
    <a
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#12c8a0] focus:ring-offset-2 focus:ring-offset-[var(--background)]",
        variant === "primary"
          ? "bg-[#1261ff] text-white shadow-[0_18px_40px_rgba(18,97,255,0.32)] hover:bg-[#0b4ed6]"
          : variant === "secondary"
          ? "surface-card hover:bg-[var(--surface-2)]"
          : "bg-transparent text-[var(--foreground)] ring-1 ring-[var(--line)] hover:bg-[var(--surface-2)]",
        className
      )}
      {...props}
    >
      {children}
      {showArrow && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
    </a>
  );
}
