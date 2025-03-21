import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary-500 text-white hover:bg-primary-600", // Para fundos escuros
        outline:
          "border border-white bg-transparent text-white hover:bg-white hover:text-neutral-900", // Para fundos escuros
        secondary: "bg-secondary-500 text-white hover:bg-secondary-600", // Para fundos escuros
        light:
          "bg-primary-500 text-white hover:bg-primary-600 border border-primary-500", // Para fundos claros, mantendo o mesmo fundo mas garantindo contraste
        lightOutline:
          "border border-primary-500 bg-transparent text-primary-500 hover:bg-primary-500 hover:text-white", // Para fundos claros
        lightSecondary:
          "bg-secondary-500 text-white hover:bg-secondary-600 border border-secondary-500", // Para fundos claros
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
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
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
