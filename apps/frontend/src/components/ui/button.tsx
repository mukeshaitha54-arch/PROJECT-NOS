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
          "bg-gradient-to-r from-[#f47b36] to-[#e66e39] hover:from-[#fa9258] hover:to-[#f47b36] text-white shadow-lg shadow-orange-500/25 font-semibold active:scale-[0.97]",
        destructive:
          "bg-rose-600 text-white shadow-sm hover:bg-rose-500 active:scale-[0.97]",
        outline:
          "border border-orange-500/30 bg-black/40 hover:bg-orange-500/20 hover:border-orange-500/60 text-zinc-100 hover:text-white backdrop-blur-md shadow-sm active:scale-[0.97]",
        secondary:
          "bg-white/[0.05] border border-orange-500/20 hover:bg-orange-500/15 hover:border-orange-500/50 text-zinc-200 hover:text-white backdrop-blur-md active:scale-[0.97]",
        ghost:
          "hover:bg-orange-500/15 text-zinc-300 hover:text-white active:scale-[0.97]",
        link: "text-[#f47b36] hover:text-[#fa9258] underline-offset-4 hover:underline",
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
