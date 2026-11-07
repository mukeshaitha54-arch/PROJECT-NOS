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
          "bg-blue-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_8px_rgba(37,99,235,0.35)] hover:bg-blue-500 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_4px_12px_rgba(37,99,235,0.45)] border border-blue-500/50",
        destructive:
          "bg-red-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_2px_8px_rgba(239,68,68,0.3)] hover:bg-red-500 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_12px_rgba(239,68,68,0.4)] border border-red-500/50",
        outline:
          "border border-white/[0.1] bg-slate-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:bg-slate-800/80 hover:text-white hover:border-white/[0.2] text-slate-300",
        secondary:
          "bg-slate-800/90 text-slate-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] hover:bg-slate-700/90 border border-slate-700/60",
        ghost: "hover:bg-slate-800/60 hover:text-white text-slate-400",
        link: "text-blue-400 underline-offset-4 hover:underline",
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
