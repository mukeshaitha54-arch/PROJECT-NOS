import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_4px_16px_rgba(255,85,0,0.35)] hover:from-orange-400 hover:to-rose-500 border border-orange-400/40",
        destructive:
          "bg-rose-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_16px_rgba(225,29,72,0.4)] hover:bg-rose-500 border border-rose-500/50",
        outline:
          "border border-white/[0.1] bg-white/[0.03] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:bg-white/[0.08] hover:border-orange-500/40 text-white",
        secondary:
          "bg-zinc-800/90 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:bg-zinc-750 border border-white/[0.08]",
        ghost: "hover:bg-white/[0.06] hover:text-white text-zinc-400",
        link: "text-orange-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-lg px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
