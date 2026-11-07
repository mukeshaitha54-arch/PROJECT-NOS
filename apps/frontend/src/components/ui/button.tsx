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
          "bg-[#f47b36] hover:bg-[#fa9258] text-white shadow-sm font-semibold active:scale-[0.97]",
        destructive: "bg-rose-600 text-white shadow-sm hover:bg-rose-500",
        outline:
          "border border-[#eadfd5] bg-[#ffffff] hover:bg-[#fff7f0] hover:border-[#f47b36] text-[#211a16] shadow-sm",
        secondary:
          "bg-[#fff7f0] text-[#211a16] border border-[#eadfd5] hover:bg-[#ffebd9]",
        ghost: "hover:bg-[#fff7f0] text-[#75685f] hover:text-[#211a16]",
        link: "text-[#f47b36] hover:text-[#ca5724] underline-offset-4 hover:underline",
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
